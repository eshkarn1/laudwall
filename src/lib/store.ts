import { db } from "./db";
import { hashPassword, sha256, token, verifyPassword } from "./crypto";
import { limits } from "./plans";
import { removeUpload } from "./media";
import type { SpaceInput, TestimonialInput, TestimonialPatch } from "./validate";

// All reads and writes. Every query that touches a space checks it belongs to the user asking.

export type User = { id: number; email: string; name: string; plan: string };
export type Space = {
  id: number; user_id: number; slug: string; name: string; question: string; thank_you: string; accent: string; created_at: string;
  hide_branding: number; webhook_url: string;
};
export type Testimonial = {
  id: number; space_id: number; author: string; role: string; body: string; rating: number; source: string;
  status: "pending" | "approved" | "rejected"; featured: number; created_at: string; photo: string; video: string;
};
export type Status = Testimonial["status"];

const SESSION_DAYS = 30;

// -- users and sessions --------------------------------------------------------------
export function createUser(name: string, email: string, password: string): User | null {
  try {
    const r = db().prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)").run(name, email, hashPassword(password));
    return { id: Number(r.lastInsertRowid), email, name, plan: "free" };
  } catch (e) {
    if (String(e).includes("UNIQUE")) return null;
    throw e;
  }
}

export function authenticate(email: string, password: string): User | null {
  const row = db().prepare("SELECT id, email, name, plan, password_hash FROM users WHERE email = ?").get(email) as
    | (User & { password_hash: string })
    | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  return { id: row.id, email: row.email, name: row.name, plan: row.plan };
}

export function createSession(userId: number): { token: string; expires: Date } {
  const t = token();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  db().prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(sha256(t), userId, expires.toISOString());
  return { token: t, expires };
}

export function userForSession(t: string | undefined): User | null {
  if (!t) return null;
  const row = db()
    .prepare("SELECT u.id, u.email, u.name, u.plan FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?")
    .get(sha256(t), new Date().toISOString()) as User | undefined;
  return row ?? null;
}

export function deleteSession(t: string): void {
  db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(t));
}

// -- API keys ------------------------------------------------------------------------
export function createApiKey(userId: number, name: string): string {
  const key = `lw_${token(24)}`;
  db().prepare("INSERT INTO api_keys (user_id, name, prefix, key_hash) VALUES (?, ?, ?, ?)").run(userId, name, key.slice(0, 7), sha256(key));
  return key;
}

export function listApiKeys(userId: number) {
  return db().prepare("SELECT id, name, prefix, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY id DESC").all(userId) as {
    id: number; name: string; prefix: string; last_used_at: string | null; created_at: string;
  }[];
}

export function deleteApiKey(userId: number, id: number): void {
  db().prepare("DELETE FROM api_keys WHERE id = ? AND user_id = ?").run(id, userId);
}

export function userForApiKey(key: string | undefined): User | null {
  if (!key?.startsWith("lw_")) return null;
  const h = sha256(key);
  const row = db().prepare("SELECT u.id, u.email, u.name, u.plan FROM api_keys k JOIN users u ON u.id = k.user_id WHERE k.key_hash = ?").get(h) as
    | User
    | undefined;
  if (row) db().prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE key_hash = ?").run(h);
  return row ?? null;
}

// -- spaces --------------------------------------------------------------------------
/** null when the slug is taken; "limit" when the plan has no room for another space. */
export function createSpace(userId: number, s: SpaceInput): Space | null | "limit" {
  const { n } = db().prepare("SELECT COUNT(*) AS n FROM spaces WHERE user_id = ?").get(userId) as { n: number };
  if (n >= limits(planOf(userId)).spaces) return "limit";
  try {
    const r = db()
      .prepare("INSERT INTO spaces (user_id, slug, name, question, thank_you, accent) VALUES (?, ?, ?, ?, ?, ?)")
      .run(userId, s.slug, s.name, s.question, s.thankYou, s.accent);
    return getSpace(userId, Number(r.lastInsertRowid));
  } catch (e) {
    if (String(e).includes("UNIQUE")) return null;
    throw e;
  }
}

export function updateSpace(userId: number, id: number, s: Omit<SpaceInput, "slug">): void {
  db()
    .prepare("UPDATE spaces SET name = ?, question = ?, thank_you = ?, accent = ? WHERE id = ? AND user_id = ?")
    .run(s.name, s.question, s.thankYou, s.accent, id, userId);
}

export function updateSpaceExtras(userId: number, id: number, x: { hideBranding: boolean; webhookUrl: string }): void {
  const hide = x.hideBranding && limits(planOf(userId)).whiteLabel;
  db().prepare("UPDATE spaces SET hide_branding = ?, webhook_url = ? WHERE id = ? AND user_id = ?").run(Number(hide), x.webhookUrl, id, userId);
}

/** Whether a space's widget and pages show "Powered by Laudwall". */
export function showBranding(space: Space): boolean {
  if (process.env.LAUDWALL_BRANDING === "off") return false;
  return !(space.hide_branding && limits(planOf(space.user_id)).whiteLabel);
}

// -- plans and billing -----------------------------------------------------------------
export function planOf(userId: number): string {
  return (db().prepare("SELECT plan FROM users WHERE id = ?").get(userId) as { plan: string } | undefined)?.plan ?? "free";
}

export function setPlan(userId: number, plan: string, stripeCustomer?: string): void {
  db().prepare("UPDATE users SET plan = ?, stripe_customer = COALESCE(?, stripe_customer) WHERE id = ?").run(plan, stripeCustomer ?? null, userId);
}

export function userByStripeCustomer(customer: string): number | null {
  return (db().prepare("SELECT id FROM users WHERE stripe_customer = ?").get(customer) as { id: number } | undefined)?.id ?? null;
}

export function stripeCustomerOf(userId: number): string | null {
  return (db().prepare("SELECT stripe_customer FROM users WHERE id = ?").get(userId) as { stripe_customer: string | null } | undefined)?.stripe_customer ?? null;
}

export function deleteSpace(userId: number, id: number): void {
  const files = db().prepare("SELECT t.photo, t.video FROM testimonials t JOIN spaces s ON s.id = t.space_id WHERE s.id = ? AND s.user_id = ?")
    .all(id, userId) as { photo: string; video: string }[];
  db().prepare("DELETE FROM spaces WHERE id = ? AND user_id = ?").run(id, userId);
  for (const f of files) (removeUpload(f.photo), removeUpload(f.video));
}

export function getSpace(userId: number, idOrSlug: number | string): Space | null {
  const col = typeof idOrSlug === "number" ? "id" : "slug";
  return (db().prepare(`SELECT * FROM spaces WHERE ${col} = ? AND user_id = ?`).get(idOrSlug, userId) as Space | undefined) ?? null;
}

/** A space by its public slug, for the collect page, the wall and the widget. */
export function publicSpace(slug: string): Space | null {
  return (db().prepare("SELECT * FROM spaces WHERE slug = ?").get(slug) as Space | undefined) ?? null;
}

export function listSpaces(userId: number) {
  return db()
    .prepare(
      `SELECT s.*, COUNT(t.id) AS total, SUM(t.status = 'pending') AS pending, SUM(t.status = 'approved') AS approved
       FROM spaces s LEFT JOIN testimonials t ON t.space_id = s.id WHERE s.user_id = ? GROUP BY s.id ORDER BY s.id DESC`,
    )
    .all(userId) as (Space & { total: number; pending: number | null; approved: number | null })[];
}

// -- testimonials --------------------------------------------------------------------
export type Media = { photo?: string; video?: string };

/** null when the space's plan is full. */
export function addTestimonial(spaceId: number, t: TestimonialInput, source = "form", status: Status = "pending", media: Media = {}): Testimonial | null {
  const owner = db().prepare("SELECT user_id FROM spaces WHERE id = ?").get(spaceId) as { user_id: number } | undefined;
  if (!owner) return null;
  const { n } = db().prepare("SELECT COUNT(*) AS n FROM testimonials WHERE space_id = ?").get(spaceId) as { n: number };
  if (n >= limits(planOf(owner.user_id)).testimonials) return null;
  const r = db()
    .prepare("INSERT INTO testimonials (space_id, author, role, body, rating, source, status, photo, video) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(spaceId, t.author, t.role, t.body, t.rating, source, status, media.photo ?? "", media.video ?? "");
  return db().prepare("SELECT * FROM testimonials WHERE id = ?").get(Number(r.lastInsertRowid)) as Testimonial;
}

export function listTestimonials(spaceId: number, opts: { status?: Status; search?: string; limit?: number } = {}): Testimonial[] {
  const where = ["space_id = ?"];
  const args: (string | number)[] = [spaceId];
  if (opts.status) (where.push("status = ?"), args.push(opts.status));
  if (opts.search) (where.push("(body LIKE ? OR author LIKE ? OR role LIKE ?)"), args.push(...Array(3).fill(`%${opts.search}%`)));
  args.push(Math.min(Math.max(opts.limit ?? 200, 1), 500));
  return db()
    .prepare(`SELECT * FROM testimonials WHERE ${where.join(" AND ")} ORDER BY featured DESC, id DESC LIMIT ?`)
    .all(...args) as Testimonial[];
}

/** The approved testimonials anyone may see: featured first, then newest. */
export function publicTestimonials(spaceId: number, limit = 50): Testimonial[] {
  return listTestimonials(spaceId, { status: "approved", limit });
}

export function getTestimonial(userId: number, id: number): Testimonial | null {
  return (
    (db()
      .prepare("SELECT t.* FROM testimonials t JOIN spaces s ON s.id = t.space_id WHERE t.id = ? AND s.user_id = ?")
      .get(id, userId) as Testimonial | undefined) ?? null
  );
}

export function updateTestimonial(userId: number, id: number, patch: TestimonialPatch): Testimonial | null {
  if (!getTestimonial(userId, id)) return null;
  const cols = { status: patch.status, featured: patch.featured === undefined ? undefined : Number(patch.featured),
    author: patch.author, role: patch.role, body: patch.body };
  const set = Object.entries(cols).filter(([, v]) => v !== undefined);
  if (set.length) {
    db().prepare(`UPDATE testimonials SET ${set.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`).run(...set.map(([, v]) => v!), id);
  }
  return getTestimonial(userId, id);
}

export function deleteTestimonial(userId: number, id: number): boolean {
  const t = getTestimonial(userId, id);
  if (!t) return false;
  db().prepare("DELETE FROM testimonials WHERE id = ?").run(id);
  removeUpload(t.photo);
  removeUpload(t.video);
  return true;
}

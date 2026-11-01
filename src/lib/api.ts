import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { userForApiKey, type Space, type Testimonial, type User } from "./store";
import { clientIp, limited } from "./limit";
import { limits } from "./plans";

// Helpers for the REST API: Bearer-key auth, JSON errors, and the shapes the API returns.

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(data, { status, headers });
}

export function error(status: number, message: string, details?: unknown) {
  return json({ error: { message, ...(details ? { details } : {}) } }, status);
}

export function invalid(e: ZodError) {
  return error(400, "Invalid request", e.issues.map((i) => ({ field: i.path.join("."), message: i.message })));
}

/** The API key's owner, or a ready-made error response. */
export function apiUser(req: Request): User | Response {
  if (limited(`api:${clientIp(req.headers)}`, 120, 60_000)) return error(429, "Too many requests: 120 a minute");
  const key = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const user = userForApiKey(key);
  if (!user) return error(401, "Send a valid API key: Authorization: Bearer lw_...");
  return limits(user.plan).api ? user : error(402, "The API and MCP server come with the Pro plan");
}

export async function body(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export const appUrl = () => (process.env.LAUDWALL_URL ?? "http://localhost:3051").replace(/\/$/, "");

export function spaceOut(s: Space) {
  const base = appUrl();
  return {
    id: s.id, slug: s.slug, name: s.name, question: s.question, accent: s.accent, created_at: s.created_at,
    collect_url: `${base}/c/${s.slug}`, wall_url: `${base}/w/${s.slug}`,
  };
}

export function testimonialOut(t: Testimonial) {
  return {
    id: t.id, space_id: t.space_id, author: t.author, role: t.role, body: t.body, rating: t.rating, source: t.source,
    status: t.status, featured: Boolean(t.featured), created_at: t.created_at, ...mediaOut(t),
  };
}

export function mediaOut(t: Testimonial) {
  return { photo: t.photo ? `${appUrl()}/media/${t.photo}` : null, video: t.video ? `${appUrl()}/media/${t.video}` : null };
}

export function embedCode(slug: string, layout: "wall" | "carousel" | "badge" = "wall") {
  return `<div data-laudwall="${slug}" data-layout="${layout}"></div>\n<script src="${appUrl()}/embed.js" async></script>`;
}

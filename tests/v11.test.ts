import { createHmac } from "node:crypto";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "@/lib/db";
import * as store from "@/lib/store";
import { parseCsv, toCsv } from "@/lib/csv";
import { saveUpload } from "@/lib/media";
import { applyEvent, checkoutUrl, verifySignature } from "@/lib/stripe";
import { notify, webhookBody, webhookProblem } from "@/lib/webhook";
import * as spaces from "@/app/api/v1/spaces/route";

const space = (slug: string) => ({ name: "Acme", slug, question: "Q?", thankYou: "Thanks", accent: "#112233" });
const words = { author: "Priya", role: "Owner", body: "Lovely people and a fast turnaround.", rating: 5 };
let user: store.User;

beforeEach(() => {
  resetDb();
  user = store.createUser("Owner", "owner@example.com", "correct horse battery")!;
});
afterEach(() => vi.unstubAllEnvs());

describe("plans", () => {
  it("are unlimited when self-hosted", () => {
    for (const s of ["a-one", "a-two", "a-three", "a-four"]) expect(store.createSpace(user.id, space(s))).not.toBe("limit");
  });

  it("limit spaces, testimonials, the badge and the API on the cloud free plan", async () => {
    vi.stubEnv("LAUDWALL_CLOUD", "on");
    const s = store.createSpace(user.id, space("one")) as store.Space;
    expect(store.createSpace(user.id, space("two"))).toBe("limit");
    for (let i = 0; i < 15; i++) expect(store.addTestimonial(s.id, words)).not.toBeNull();
    expect(store.addTestimonial(s.id, words)).toBeNull();
    store.updateSpaceExtras(user.id, s.id, { hideBranding: true, webhookUrl: "" });
    expect(store.showBranding(store.getSpace(user.id, s.id)!)).toBe(true);
    const key = store.createApiKey(user.id, "x");
    const res = await spaces.GET(new Request("http://x/api/v1/spaces", { headers: { authorization: `Bearer ${key}` } }));
    expect(res.status).toBe(402);

    store.setPlan(user.id, "pro");
    expect(store.addTestimonial(s.id, words)).not.toBeNull();
    store.updateSpaceExtras(user.id, s.id, { hideBranding: true, webhookUrl: "" });
    expect(store.showBranding(store.getSpace(user.id, s.id)!)).toBe(false);
    expect((await spaces.GET(new Request("http://x/api/v1/spaces", { headers: { authorization: `Bearer ${key}` } }))).status).toBe(200);
  });
});

describe("stripe", () => {
  const secret = "whsec_test";
  const sign = (body: string, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;

  it("accepts only fresh, correctly signed webhooks", () => {
    const body = '{"type":"ping"}';
    expect(verifySignature(body, sign(body), secret)).toBe(true);
    expect(verifySignature(body + " ", sign(body), secret)).toBe(false);
    expect(verifySignature(body, sign(body, Math.floor(Date.now() / 1000) - 600), secret)).toBe(false);
    expect(verifySignature(body, null, secret)).toBe(false);
  });

  it("moves the account between plans as the subscription changes", () => {
    applyEvent({ type: "checkout.session.completed", data: { object: { client_reference_id: String(user.id), customer: "cus_1", metadata: { plan: "pro" } } } });
    expect(store.planOf(user.id)).toBe("pro");
    applyEvent({ type: "customer.subscription.updated", data: { object: { customer: "cus_1", status: "active", metadata: { plan: "agency" } } } });
    expect(store.planOf(user.id)).toBe("agency");
    applyEvent({ type: "customer.subscription.deleted", data: { object: { customer: "cus_1", metadata: { plan: "agency" } } } });
    expect(store.planOf(user.id)).toBe("free");
  });

  it("asks Stripe for a subscription checkout for the right price", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test");
    vi.stubEnv("STRIPE_PRICE_PRO", "price_pro");
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => Response.json({ url: "https://checkout.stripe.com/x" }));
    expect(await checkoutUrl(user, "pro", fetchImpl as unknown as typeof fetch)).toBe("https://checkout.stripe.com/x");
    const form = new URLSearchParams(String(fetchImpl.mock.calls[0][1]!.body));
    expect(form.get("line_items[0][price]")).toBe("price_pro");
    expect(form.get("client_reference_id")).toBe(String(user.id));
    expect(form.get("customer_email")).toBe("owner@example.com");
  });
});

describe("webhooks", () => {
  it("refuse plain http and private addresses", async () => {
    expect(await webhookProblem("http://example.com/hook")).toMatch(/https/);
    expect(await webhookProblem("https://localhost/hook")).toMatch(/private/);
    expect(await webhookProblem("https://127.0.0.1/hook")).toMatch(/private/);
    expect(await webhookProblem("https://10.1.2.3/hook")).toMatch(/private/);
    expect(await webhookProblem("https://[::1]/hook")).toMatch(/private/);
    expect(await webhookProblem("https://93.184.215.14/hook")).toBe("");
  });

  it("send a Slack-ready body and never throw", async () => {
    const s = store.createSpace(user.id, space("acme")) as store.Space;
    store.updateSpaceExtras(user.id, s.id, { hideBranding: false, webhookUrl: "https://93.184.215.14/hook" });
    const t = store.addTestimonial(s.id, words)!;
    expect(webhookBody(s, t).text).toContain("“Lovely people");
    const fetchImpl = vi.fn(async () => { throw new Error("down"); });
    await expect(notify(store.getSpace(user.id, s.id)!, t, fetchImpl as unknown as typeof fetch)).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});

describe("csv", () => {
  it("round-trips quotes, commas and line breaks, and defuses formulas", () => {
    const s = store.createSpace(user.id, space("acme")) as store.Space;
    store.addTestimonial(s.id, { ...words, body: 'She said "wow", then\nordered two.' });
    store.addTestimonial(s.id, { ...words, author: "=HYPERLINK(1)" });
    const rows = parseCsv(toCsv(store.listTestimonials(s.id)));
    expect(rows.map((r) => r.body)).toContain('She said "wow", then\nordered two.');
    expect(rows.map((r) => r.author)).toContain("'=HYPERLINK(1)");
  });
});

describe("uploads", () => {
  it("keep real images and videos and refuse anything pretending", async () => {
    vi.stubEnv("LAUDWALL_UPLOADS", mkdtempSync(join(tmpdir(), "lw-")));
    const png = new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])]);
    const mp4 = new Blob([Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from("ftypisom"), Buffer.alloc(8)])]);
    const html = new Blob(["<script>alert(1)</script>"], { type: "image/png" });
    expect(await saveUpload(png, "photo")).toMatchObject({ name: expect.stringMatching(/^[a-f0-9]{24}\.png$/) });
    expect(await saveUpload(mp4, "video")).toMatchObject({ name: expect.stringMatching(/\.mp4$/) });
    expect(await saveUpload(html, "photo")).toEqual({ error: expect.stringContaining("JPG") });
    expect(await saveUpload(png, "video")).toEqual({ error: expect.stringContaining("MP4") });
    expect(await saveUpload(null, "photo")).toEqual({ name: "" });
    expect(readdirSync(process.env.LAUDWALL_UPLOADS!)).toHaveLength(2);
  });
});

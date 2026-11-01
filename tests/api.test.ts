import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/lib/db";
import * as store from "@/lib/store";
import * as spaces from "@/app/api/v1/spaces/route";
import * as testimonials from "@/app/api/v1/spaces/[slug]/testimonials/route";
import * as embed from "@/app/api/v1/spaces/[slug]/embed/route";
import * as one from "@/app/api/v1/testimonials/[id]/route";
import * as feed from "@/app/api/public/[slug]/route";
import { GET as widget } from "@/app/embed.js/route";

const URL_ = "http://localhost:3051";
let key = "";
const req = (path: string, init: RequestInit & { json?: unknown } = {}, auth = key) =>
  new Request(URL_ + path, {
    ...init,
    headers: { ...(auth ? { authorization: `Bearer ${auth}` } : {}), "content-type": "application/json" },
    body: init.json === undefined ? undefined : JSON.stringify(init.json),
  });
const slug = (s: string) => ({ params: Promise.resolve({ slug: s }) });
const id = (n: number) => ({ params: Promise.resolve({ id: String(n) }) });

beforeEach(() => {
  resetDb();
  const u = store.createUser("Owner", "owner@example.com", "correct horse battery")!;
  key = store.createApiKey(u.id, "test");
});

describe("REST API v1", () => {
  it("refuses requests without a valid key", async () => {
    expect((await spaces.GET(req("/api/v1/spaces", {}, ""))).status).toBe(401);
    expect((await spaces.GET(req("/api/v1/spaces", {}, "lw_nope"))).status).toBe(401);
  });

  it("creates a space, imports, approves, features and deletes testimonials", async () => {
    const made = await spaces.POST(req("/api/v1/spaces", { method: "POST", json: { name: "Acme", slug: "acme" } }));
    expect(made.status).toBe(201);
    expect((await made.json()).space.collect_url).toBe(`${URL_}/c/acme`);
    expect((await spaces.POST(req("/api/v1/spaces", { method: "POST", json: { name: "Acme", slug: "acme" } }))).status).toBe(409);

    const bad = await testimonials.POST(req("/api/v1/spaces/acme/testimonials", { method: "POST", json: { author: "X", body: "short" } }), slug("acme"));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.details[0].field).toBe("body");

    const t = await testimonials.POST(
      req("/api/v1/spaces/acme/testimonials", { method: "POST", json: { author: "Priya", role: "Owner, Bloom", body: "Fast, friendly and the site doubled our bookings.", rating: 5 } }),
      slug("acme"),
    );
    expect(t.status).toBe(201);
    const { testimonial } = await t.json();
    expect(testimonial).toMatchObject({ status: "pending", source: "api", featured: false });

    const patched = await one.PATCH(req(`/api/v1/testimonials/${testimonial.id}`, { method: "PATCH", json: { status: "approved", featured: true } }), id(testimonial.id));
    expect((await patched.json()).testimonial).toMatchObject({ status: "approved", featured: true });

    const listed = await testimonials.GET(req("/api/v1/spaces/acme/testimonials?status=approved&search=bookings"), slug("acme"));
    expect((await listed.json()).testimonials).toHaveLength(1);
    expect((await testimonials.GET(req("/api/v1/spaces/acme/testimonials?status=bogus"), slug("acme"))).status).toBe(400);

    const code = await (await embed.GET(req("/api/v1/spaces/acme/embed?layout=carousel"), slug("acme"))).json();
    expect(code.html).toContain('data-layout="carousel"');

    const counts = (await (await spaces.GET(req("/api/v1/spaces"))).json()).spaces[0].counts;
    expect(counts).toEqual({ total: 1, pending: 0, approved: 1 });

    expect((await one.DELETE(req(`/api/v1/testimonials/${testimonial.id}`, { method: "DELETE" }), id(testimonial.id))).status).toBe(204);
    expect((await one.GET(req(`/api/v1/testimonials/${testimonial.id}`), id(testimonial.id))).status).toBe(404);
  });

  it("never lets one key reach another account's space", async () => {
    await spaces.POST(req("/api/v1/spaces", { method: "POST", json: { name: "Acme", slug: "acme" } }));
    const other = store.createUser("Other", "other@example.com", "correct horse battery")!;
    const otherKey = store.createApiKey(other.id, "x");
    expect((await testimonials.GET(req("/api/v1/spaces/acme/testimonials", {}, otherKey), slug("acme"))).status).toBe(404);
  });
});

describe("public feed and widget", () => {
  it("serves approved testimonials only, readable cross-origin", async () => {
    const u = store.userForApiKey(key)!;
    const s = store.createSpace(u.id, { name: "Acme", slug: "acme", question: "Q?", thankYou: "Thanks", accent: "#112233" }) as store.Space;
    store.addTestimonial(s.id, { author: "Approved", role: "", body: "Shown on the wall for sure.", rating: 5 }, "form", "approved");
    store.addTestimonial(s.id, { author: "Pending", role: "", body: "Not shown until approved.", rating: 4 });
    const res = await feed.GET(new Request(`${URL_}/api/public/acme`), slug("acme"));
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const data = await res.json();
    expect(data.testimonials.map((t: { author: string }) => t.author)).toEqual(["Approved"]);
    expect(data.space.accent).toBe("#112233");
    expect((await feed.GET(new Request(`${URL_}/api/public/nope`), slug("nope"))).status).toBe(404);
  });

  it("serves a widget script that parses as JavaScript", async () => {
    const res = widget();
    expect(res.headers.get("content-type")).toContain("javascript");
    const { WIDGET_JS } = await import("@/lib/widget");
    expect(() => new Function(WIDGET_JS)).not.toThrow();
    expect(WIDGET_JS).toContain("attachShadow");
  });
});

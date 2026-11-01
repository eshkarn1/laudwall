import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/lib/db";
import * as store from "@/lib/store";
import { spaceSchema, testimonialPatchSchema, testimonialSchema } from "@/lib/validate";

const space = (slug: string) => spaceSchema.parse({ name: "Acme Bakery", slug });
const words = (author: string, body = "They baked the best wedding cake we have ever had.") =>
  testimonialSchema.parse({ author, body, rating: 5 });

beforeEach(() => resetDb());

describe("accounts", () => {
  it("signs up once per email and checks the password", () => {
    expect(store.createUser("Sam", "sam@example.com", "correct horse battery")).not.toBeNull();
    expect(store.createUser("Sam", "SAM@example.com", "another password")).toBeNull();
    expect(store.authenticate("sam@example.com", "correct horse battery")?.name).toBe("Sam");
    expect(store.authenticate("sam@example.com", "wrong password")).toBeNull();
  });

  it("finds a user by session token until it is deleted", () => {
    const u = store.createUser("Sam", "sam@example.com", "correct horse battery")!;
    const { token } = store.createSession(u.id);
    expect(store.userForSession(token)?.id).toBe(u.id);
    expect(store.userForSession("forged")).toBeNull();
    store.deleteSession(token);
    expect(store.userForSession(token)).toBeNull();
  });

  it("stores API keys hashed and resolves them to their owner", () => {
    const u = store.createUser("Sam", "sam@example.com", "correct horse battery")!;
    const key = store.createApiKey(u.id, "Claude");
    expect(key).toMatch(/^lw_/);
    expect(store.userForApiKey(key)?.id).toBe(u.id);
    expect(store.listApiKeys(u.id)[0]).toMatchObject({ name: "Claude", prefix: key.slice(0, 7) });
    store.deleteApiKey(u.id, store.listApiKeys(u.id)[0].id);
    expect(store.userForApiKey(key)).toBeNull();
  });
});

describe("spaces and testimonials", () => {
  it("keeps one user's spaces and testimonials away from another", () => {
    const a = store.createUser("A", "a@example.com", "correct horse battery")!;
    const b = store.createUser("B", "b@example.com", "correct horse battery")!;
    const s = store.createSpace(a.id, space("acme"))!;
    expect(store.createSpace(b.id, space("acme"))).toBeNull(); // slugs are global: they're public URLs
    const t = store.addTestimonial(s.id, words("Priya"))!;
    expect(store.getSpace(b.id, s.id)).toBeNull();
    expect(store.updateTestimonial(b.id, t.id, { status: "approved" })).toBeNull();
    expect(store.deleteTestimonial(b.id, t.id)).toBe(false);
    expect(store.getTestimonial(a.id, t.id)?.status).toBe("pending");
  });

  it("shows only approved testimonials publicly, featured first", () => {
    const a = store.createUser("A", "a@example.com", "correct horse battery")!;
    const s = store.createSpace(a.id, space("acme"))!;
    const [one, two, three] = ["One", "Two", "Three"].map((n) => store.addTestimonial(s.id, words(n))!);
    store.updateTestimonial(a.id, one.id, { status: "approved", featured: true });
    store.updateTestimonial(a.id, two.id, { status: "approved" });
    store.updateTestimonial(a.id, three.id, { status: "rejected" });
    expect(store.publicTestimonials(s.id).map((t) => t.author)).toEqual(["One", "Two"]);
    expect(store.listTestimonials(s.id, { search: "wedding" })).toHaveLength(3);
    expect(store.listSpaces(a.id)[0]).toMatchObject({ total: 3, pending: 0, approved: 2 });
  });
});

describe("validation", () => {
  it("rejects bad slugs, short testimonials and empty patches", () => {
    expect(spaceSchema.safeParse({ name: "X", slug: "a" }).success).toBe(false);
    expect(spaceSchema.safeParse({ name: "X", slug: "bad slug!" }).success).toBe(false);
    expect(spaceSchema.parse({ name: "X", slug: "Good-Slug" }).slug).toBe("good-slug");
    expect(testimonialSchema.safeParse({ author: "A", body: "ok" }).success).toBe(false);
    expect(testimonialSchema.parse({ author: "A", body: "Lovely people to work with", rating: "4" }).rating).toBe(4);
    expect(testimonialPatchSchema.safeParse({}).success).toBe(false);
  });
});

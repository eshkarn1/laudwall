"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ActionForm";
import { endSession, requireUser, startSession } from "@/lib/auth";
import { clientIp, limited } from "@/lib/limit";
import * as store from "@/lib/store";
import { fieldErrors, loginSchema, signupSchema, spaceSchema, statusSchema, testimonialSchema } from "@/lib/validate";
import type { ZodError } from "zod";

const form = (data: FormData) => Object.fromEntries(data) as Record<string, string>;
const firstError = (e: ZodError) => Object.values(fieldErrors(e))[0] ?? "Check the form and try again";
const ip = async () => clientIp(await headers());

// -- accounts ------------------------------------------------------------------------
export async function signup(_: FormState, data: FormData): Promise<FormState> {
  if (process.env.LAUDWALL_SIGNUPS === "off") return { error: "Sign-ups are closed on this server" };
  if (limited(`signup:${await ip()}`, 5, 3600_000)) return { error: "Too many sign-ups from here. Try again later." };
  const parsed = signupSchema.safeParse(form(data));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const user = store.createUser(parsed.data.name, parsed.data.email, parsed.data.password);
  if (!user) return { error: "That email already has an account. Log in instead." };
  await startSession(user.id);
  redirect("/dashboard");
}

export async function login(_: FormState, data: FormData): Promise<FormState> {
  if (limited(`login:${await ip()}`, 10, 900_000)) return { error: "Too many attempts. Wait 15 minutes and try again." };
  const parsed = loginSchema.safeParse(form(data));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const user = store.authenticate(parsed.data.email, parsed.data.password);
  if (!user) return { error: "Wrong email or password" };
  await startSession(user.id);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}

// -- spaces --------------------------------------------------------------------------
export async function createSpace(_: FormState, data: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = spaceSchema.safeParse(form(data));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const space = store.createSpace(user.id, parsed.data);
  if (!space) return { error: `The address /c/${parsed.data.slug} is taken. Try another.` };
  redirect(`/dashboard/${space.slug}`);
}

export async function updateSpace(spaceId: number, _: FormState, data: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = spaceSchema.omit({ slug: true }).safeParse(form(data));
  if (!parsed.success) return { error: firstError(parsed.error) };
  store.updateSpace(user.id, spaceId, parsed.data);
  revalidatePath("/dashboard", "layout");
  return { ok: "Saved" };
}

export async function deleteSpace(spaceId: number): Promise<void> {
  const user = await requireUser();
  store.deleteSpace(user.id, spaceId);
  redirect("/dashboard");
}

// -- testimonials --------------------------------------------------------------------
export async function setStatus(id: number, status: string): Promise<void> {
  const user = await requireUser();
  const s = statusSchema.safeParse(status);
  if (s.success) store.updateTestimonial(user.id, id, { status: s.data });
  revalidatePath("/dashboard", "layout");
}

export async function setFeatured(id: number, featured: boolean): Promise<void> {
  const user = await requireUser();
  store.updateTestimonial(user.id, id, { featured, ...(featured ? { status: "approved" as const } : {}) });
  revalidatePath("/dashboard", "layout");
}

export async function removeTestimonial(id: number): Promise<void> {
  const user = await requireUser();
  store.deleteTestimonial(user.id, id);
  revalidatePath("/dashboard", "layout");
}

/** Add one you already have (an email, a review) by hand. It goes straight to approved. */
export async function importTestimonial(spaceId: number, _: FormState, data: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!store.getSpace(user.id, spaceId)) return { error: "No such space" };
  const parsed = testimonialSchema.safeParse(form(data));
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (!store.addTestimonial(spaceId, parsed.data, "import", "approved")) return { error: "This space is at its testimonial limit" };
  revalidatePath("/dashboard", "layout");
  return { ok: `Added ${parsed.data.author}'s testimonial` };
}

/** The public collect form. A hidden "website" field catches bots; real people never fill it. */
export async function submitTestimonial(slug: string, _: FormState, data: FormData): Promise<FormState> {
  const space = store.publicSpace(slug);
  if (!space) return { error: "This page no longer collects testimonials" };
  if (data.get("website")) return { ok: space.thank_you };
  if (limited(`collect:${await ip()}`, 5, 3600_000)) return { error: "Thanks! We've had a few from you already. Try again later." };
  if (data.get("consent") !== "on") return { error: "Please tick the box so we can share your words" };
  const parsed = testimonialSchema.safeParse(form(data));
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (!store.addTestimonial(space.id, parsed.data)) return { error: "This page isn't taking new testimonials right now" };
  return { ok: space.thank_you };
}

// -- API keys ------------------------------------------------------------------------
export async function createKey(_: FormState, data: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(data.get("name") ?? "").trim().slice(0, 60) || "API key";
  const key = store.createApiKey(user.id, name);
  revalidatePath("/dashboard/settings");
  return { ok: "Copy this key now. It won't be shown again.", secret: key };
}

export async function deleteKey(id: number): Promise<void> {
  const user = await requireUser();
  store.deleteApiKey(user.id, id);
  revalidatePath("/dashboard/settings");
}

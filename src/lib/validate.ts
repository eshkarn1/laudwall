import { z } from "zod";

// Every input that crosses the boundary (forms, the REST API, the MCP server) goes through one of these.
const text = (max: number) => z.string().trim().max(max);

export const signupSchema = z.object({
  name: text(80).min(1, "Your name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  password: z.string().min(10, "Use at least 10 characters").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(200),
});

export const spaceSchema = z.object({
  name: text(80).min(1, "Give the space a name"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "3–40 characters: letters, numbers and dashes"),
  question: text(200).min(1).default("How did we help you?"),
  thankYou: text(200).min(1).default("Thank you! Your words mean a lot."),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #4f46e5").default("#4f46e5"),
});

export const testimonialSchema = z.object({
  author: text(80).min(1, "Your name is required"),
  role: text(120).default(""),
  body: text(2000).min(10, "Write at least a sentence (10 characters)"),
  rating: z.coerce.number().int().min(1).max(5).default(5),
});

export const statusSchema = z.enum(["pending", "approved", "rejected"]);

export const testimonialPatchSchema = z
  .object({ status: statusSchema, featured: z.boolean(), author: text(80).min(1), role: text(120), body: text(2000).min(10) })
  .partial()
  .refine((p) => Object.keys(p).length > 0, "Nothing to update");

export type SpaceInput = z.infer<typeof spaceSchema>;
export type TestimonialInput = z.infer<typeof testimonialSchema>;
export type TestimonialPatch = z.infer<typeof testimonialPatchSchema>;

/** First error message per field, for showing next to a form input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "form")] ??= issue.message;
  return out;
}

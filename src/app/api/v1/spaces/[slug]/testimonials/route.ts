import { z } from "zod";
import { apiUser, body, error, invalid, json, testimonialOut } from "@/lib/api";
import { addTestimonial, getSpace, listTestimonials } from "@/lib/store";
import { statusSchema, testimonialSchema } from "@/lib/validate";

type Ctx = { params: Promise<{ slug: string }> };

const query = z.object({
  status: statusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export async function GET(req: Request, { params }: Ctx) {
  const user = apiUser(req);
  if (user instanceof Response) return user;
  const space = getSpace(user.id, (await params).slug);
  if (!space) return error(404, "No such space");
  const q = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return invalid(q.error);
  return json({ testimonials: listTestimonials(space.id, q.data).map(testimonialOut) });
}

/** Import a testimonial you already have (an email, a review). It lands as pending unless you say otherwise. */
export async function POST(req: Request, { params }: Ctx) {
  const user = apiUser(req);
  if (user instanceof Response) return user;
  const space = getSpace(user.id, (await params).slug);
  if (!space) return error(404, "No such space");
  const parsed = testimonialSchema
    .extend({ status: statusSchema.default("pending"), source: z.string().trim().max(40).default("api") })
    .safeParse(await body(req));
  if (!parsed.success) return invalid(parsed.error);
  const { status, source, ...t } = parsed.data;
  const created = addTestimonial(space.id, t, source, status);
  return created ? json({ testimonial: testimonialOut(created) }, 201) : error(402, "This space is at its plan's testimonial limit");
}

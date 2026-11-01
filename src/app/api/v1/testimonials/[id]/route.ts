import { apiUser, body, error, invalid, json, testimonialOut } from "@/lib/api";
import { deleteTestimonial, getTestimonial, updateTestimonial } from "@/lib/store";
import { testimonialPatchSchema } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

async function id(params: Ctx["params"]) {
  const n = Number((await params).id);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export async function GET(req: Request, { params }: Ctx) {
  const user = apiUser(req);
  if (user instanceof Response) return user;
  const t = getTestimonial(user.id, await id(params));
  return t ? json({ testimonial: testimonialOut(t) }) : error(404, "No such testimonial");
}

export async function PATCH(req: Request, { params }: Ctx) {
  const user = apiUser(req);
  if (user instanceof Response) return user;
  const parsed = testimonialPatchSchema.safeParse(await body(req));
  if (!parsed.success) return invalid(parsed.error);
  const t = updateTestimonial(user.id, await id(params), parsed.data);
  return t ? json({ testimonial: testimonialOut(t) }) : error(404, "No such testimonial");
}

export async function DELETE(req: Request, { params }: Ctx) {
  const user = apiUser(req);
  if (user instanceof Response) return user;
  return deleteTestimonial(user.id, await id(params)) ? new Response(null, { status: 204 }) : error(404, "No such testimonial");
}

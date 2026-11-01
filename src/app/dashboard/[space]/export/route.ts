import { currentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { getSpace, listTestimonials } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ space: string }> }) {
  const user = await currentUser();
  const space = user && getSpace(user.id, (await params).space);
  if (!space) return new Response("Not found", { status: 404 });
  return new Response("﻿" + toCsv(listTestimonials(space.id, { limit: 500 })), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${space.slug}-testimonials.csv"` },
  });
}

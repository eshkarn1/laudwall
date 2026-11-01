import { z } from "zod";
import { apiUser, embedCode, error, invalid, json, spaceOut } from "@/lib/api";
import { getSpace } from "@/lib/store";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = apiUser(req);
  if (user instanceof Response) return user;
  const space = getSpace(user.id, (await params).slug);
  if (!space) return error(404, "No such space");
  const layout = z.enum(["wall", "carousel", "badge"]).default("wall").safeParse(new URL(req.url).searchParams.get("layout") ?? undefined);
  if (!layout.success) return invalid(layout.error);
  return json({ ...spaceOut(space), layout: layout.data, html: embedCode(space.slug, layout.data) });
}

import { apiUser, body, error, invalid, json, spaceOut } from "@/lib/api";
import { createSpace, listSpaces } from "@/lib/store";
import { spaceSchema } from "@/lib/validate";

export async function GET(req: Request) {
  const user = apiUser(req);
  if (user instanceof Response) return user;
  return json({
    spaces: listSpaces(user.id).map((s) => ({ ...spaceOut(s), counts: { total: s.total, pending: s.pending ?? 0, approved: s.approved ?? 0 } })),
  });
}

export async function POST(req: Request) {
  const user = apiUser(req);
  if (user instanceof Response) return user;
  const parsed = spaceSchema.safeParse(await body(req));
  if (!parsed.success) return invalid(parsed.error);
  const space = createSpace(user.id, parsed.data);
  return space ? json({ space: spaceOut(space) }, 201) : error(409, `The slug "${parsed.data.slug}" is taken`);
}

import { json, mediaOut } from "@/lib/api";
import { publicSpace, publicTestimonials, showBranding } from "@/lib/store";

// The read-only feed the embed widget loads: approved testimonials only, readable from any site.
const CORS = { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60" };

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const space = publicSpace((await params).slug);
  if (!space) return json({ error: { message: "No such space" } }, 404, CORS);
  return json(
    {
      space: { slug: space.slug, name: space.name, accent: space.accent },
      branding: showBranding(space),
      testimonials: publicTestimonials(space.id).map((t) => ({
        id: t.id, author: t.author, role: t.role, body: t.body, rating: t.rating, featured: Boolean(t.featured), created_at: t.created_at, ...mediaOut(t),
      })),
    },
    200,
    CORS,
  );
}

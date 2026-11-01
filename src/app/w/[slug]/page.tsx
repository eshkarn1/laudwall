import { notFound } from "next/navigation";
import { Stars } from "@/components/bits";
import { publicSpace, publicTestimonials } from "@/lib/store";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const space = publicSpace((await params).slug);
  return space ? { title: `What people say about ${space.name}` } : { title: "Not found" };
}

export default async function Wall({ params }: Props) {
  const space = publicSpace((await params).slug);
  if (!space) notFound();
  const list = publicTestimonials(space.id, 200);
  const avg = list.length ? list.reduce((s, t) => s + t.rating, 0) / list.length : 0;
  return (
    <main className="wrap" style={{ ["--accent" as string]: space.accent, paddingBottom: 40 }}>
      <section className="hero" style={{ paddingBottom: 24 }}>
        <h1>What people say about {space.name}</h1>
        {list.length > 0 && <p><Stars n={Math.round(avg)} /> {avg.toFixed(1)} from {list.length} {list.length === 1 ? "review" : "reviews"}</p>}
        <a className="btn primary" href={`/c/${space.slug}`}>Leave a testimonial</a>
      </section>
      {list.length === 0 ? <p className="empty">No testimonials yet. Be the first.</p> : (
        <div style={{ columns: "3 280px", columnGap: 16 }}>
          {list.map((t) => (
            <figure key={t.id} className="panel" style={{ breakInside: "avoid", margin: "0 0 16px", ...(t.featured ? { borderColor: space.accent } : {}) }}>
              <Stars n={t.rating} />
              <blockquote className="quote" style={{ marginInline: 0 }}>{t.body}</blockquote>
              <figcaption><b>{t.author}</b>{t.role && <div className="muted small">{t.role}</div>}</figcaption>
            </figure>
          ))}
        </div>
      )}
      <footer>Collected with <a href="/">Laudwall</a></footer>
    </main>
  );
}

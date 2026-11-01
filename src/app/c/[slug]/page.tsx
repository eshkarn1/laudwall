import { notFound } from "next/navigation";
import { ActionForm, Submit } from "@/components/ActionForm";
import { publicSpace } from "@/lib/store";
import { submitTestimonial } from "../../actions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const space = publicSpace((await params).slug);
  return { title: space ? `Share your experience with ${space.name}` : "Not found", robots: { index: false } };
}

export default async function Collect({ params }: Props) {
  const space = publicSpace((await params).slug);
  if (!space) notFound();
  return (
    <main className="narrow" style={{ ["--accent" as string]: space.accent }}>
      <div className="panel">
        <p className="muted small">{space.name}</p>
        <h1>{space.question}</h1>
        <ActionForm action={submitTestimonial.bind(null, space.slug)} className="stack">
          <div className="field">
            <label htmlFor="body">Your testimonial</label>
            <textarea id="body" name="body" required minLength={10} maxLength={2000} placeholder="What was it like working with us?" />
          </div>
          <div className="field">
            <label htmlFor="rating">Rating</label>
            <select id="rating" name="rating" defaultValue="5">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)} {n} / 5</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="author">Your name</label><input id="author" name="author" required maxLength={80} autoComplete="name" /></div>
          <div className="field"><label htmlFor="role">Role and company <span className="muted">(optional)</span></label><input id="role" name="role" maxLength={120} placeholder="Owner, Riverside Dental" /></div>
          <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
            <label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <label className="check">
            <input type="checkbox" name="consent" required /> {space.name} may show my words, name and role on its website.
          </label>
          <Submit>Send testimonial</Submit>
        </ActionForm>
      </div>
      <p className="muted small" style={{ textAlign: "center", marginTop: 16 }}>Collected with <a href="/">Laudwall</a></p>
    </main>
  );
}

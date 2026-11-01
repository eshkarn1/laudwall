import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Stars } from "@/components/bits";
import { appUrl, embedCode } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getSpace, listTestimonials, type Status } from "@/lib/store";
import { deleteSpace, importTestimonial, removeTestimonial, setFeatured, setStatus, updateSpace } from "../../actions";

type Props = { params: Promise<{ space: string }>; searchParams: Promise<{ tab?: string; q?: string }> };
const TABS: Status[] = ["pending", "approved", "rejected"];
const LABEL = { pending: "Waiting", approved: "Approved", rejected: "Rejected" };

export default async function SpacePage({ params, searchParams }: Props) {
  const user = await requireUser();
  const space = getSpace(user.id, (await params).space);
  if (!space) notFound();
  const { tab: rawTab, q } = await searchParams;
  const tab = TABS.includes(rawTab as Status) ? (rawTab as Status) : "pending";
  const list = listTestimonials(space.id, { status: tab, search: q?.slice(0, 100) });
  const counts = Object.fromEntries(TABS.map((s) => [s, listTestimonials(space.id, { status: s, limit: 500 }).length]));
  const base = appUrl();

  return (
    <div className="stack">
      <div className="row spread">
        <div><p className="muted small"><Link href="/dashboard">Spaces</Link> /</p><h1>{space.name}</h1></div>
        <div className="row"><a className="btn" href={`/w/${space.slug}`} target="_blank">View wall</a><a className="btn primary" href={`/c/${space.slug}`} target="_blank">Open collect page</a></div>
      </div>

      <div className="split">
        <section className="panel">
          <nav className="tabs">
            {TABS.map((s) => <Link key={s} href={`?tab=${s}`} className={s === tab ? "on" : ""}>{LABEL[s]} ({counts[s]})</Link>)}
          </nav>
          <form className="row" style={{ marginBottom: 16 }}>
            <input type="hidden" name="tab" value={tab} />
            <input name="q" defaultValue={q} placeholder="Search words, names, companies" style={{ flex: 1, minWidth: 160 }} />
            <button className="btn">Search</button>
          </form>
          {list.length === 0 ? (
            <p className="empty">{tab === "pending" ? "Nothing waiting. Share your collect link to get testimonials." : `No ${LABEL[tab].toLowerCase()} testimonials${q ? " match" : " yet"}.`}</p>
          ) : (
            <div className="stack">
              {list.map((t) => (
                <article key={t.id} className="panel" style={{ boxShadow: "none" }}>
                  <div className="row spread">
                    <Stars n={t.rating} />
                    <span className="row">{t.featured ? <span className="pill">★ Featured</span> : null}<span className="pill">{t.source}</span><span className="muted small">{t.created_at.slice(0, 10)}</span></span>
                  </div>
                  <p className="quote">{t.body}</p>
                  <p className="small"><b>{t.author}</b>{t.role && <span className="muted"> · {t.role}</span>}</p>
                  <div className="row">
                    {t.status !== "approved" && <form action={setStatus.bind(null, t.id, "approved")}><button className="btn small primary">Approve</button></form>}
                    {t.status !== "rejected" && <form action={setStatus.bind(null, t.id, "rejected")}><button className="btn small">Reject</button></form>}
                    <form action={setFeatured.bind(null, t.id, !t.featured)}><button className="btn small">{t.featured ? "Unfeature" : "Feature"}</button></form>
                    <form action={removeTestimonial.bind(null, t.id)}><button className="btn small danger">Delete</button></form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="stack">
          <div className="panel">
            <h3>Collect link</h3>
            <p className="muted small">Send this to happy customers.</p>
            <pre>{`${base}/c/${space.slug}`}</pre>
          </div>
          <div className="panel">
            <h3>Embed on your site</h3>
            <p className="muted small">Paste where the testimonials should appear. Only approved ones show. Layouts: <code>wall</code>, <code>carousel</code>, <code>badge</code>.</p>
            <pre>{embedCode(space.slug)}</pre>
          </div>
          <div className="panel">
            <h3>Add one you already have</h3>
            <ActionForm action={importTestimonial.bind(null, space.id)} className="stack">
              <div className="field"><label htmlFor="i-body">Testimonial</label><textarea id="i-body" name="body" required minLength={10} maxLength={2000} style={{ minHeight: 80 }} /></div>
              <div className="field"><label htmlFor="i-author">Name</label><input id="i-author" name="author" required maxLength={80} /></div>
              <div className="field"><label htmlFor="i-role">Role and company</label><input id="i-role" name="role" maxLength={120} /></div>
              <div className="field"><label htmlFor="i-rating">Rating</label><select id="i-rating" name="rating" defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select></div>
              <Submit className="btn">Add as approved</Submit>
            </ActionForm>
          </div>
          <div className="panel">
            <h3>Settings</h3>
            <ActionForm action={updateSpace.bind(null, space.id)} className="stack">
              <div className="field"><label htmlFor="s-name">Name</label><input id="s-name" name="name" defaultValue={space.name} required maxLength={80} /></div>
              <div className="field"><label htmlFor="s-q">Question</label><input id="s-q" name="question" defaultValue={space.question} required maxLength={200} /></div>
              <div className="field"><label htmlFor="s-t">Thank-you message</label><input id="s-t" name="thankYou" defaultValue={space.thank_you} required maxLength={200} /></div>
              <div className="field"><label htmlFor="s-a">Accent colour</label><input id="s-a" name="accent" type="color" defaultValue={space.accent} /></div>
              <Submit className="btn">Save</Submit>
            </ActionForm>
            <form action={deleteSpace.bind(null, space.id)} style={{ marginTop: 16 }}>
              <button className="btn small danger">Delete this space and its testimonials</button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ActionForm, Submit } from "@/components/ActionForm";
import { requireUser } from "@/lib/auth";
import { listSpaces } from "@/lib/store";
import { createSpace } from "../actions";

export const metadata = { title: "Spaces" };

export default async function Dashboard() {
  const user = await requireUser();
  const spaces = listSpaces(user.id);
  return (
    <div className="stack">
      <div>
        <h1>Your spaces</h1>
        <p className="muted">A space is one business or product: its own testimonial link, inbox and widget.</p>
      </div>
      {spaces.length > 0 && (
        <div className="grid">
          {spaces.map((s) => (
            <Link key={s.id} href={`/dashboard/${s.slug}`} className="panel" style={{ textDecoration: "none", color: "inherit", borderTop: `3px solid ${s.accent}` }}>
              <h2>{s.name}</h2>
              <p className="muted small">/c/{s.slug}</p>
              <div className="row">
                <span className="pill approved">{s.approved ?? 0} approved</span>
                {(s.pending ?? 0) > 0 && <span className="pill pending">{s.pending} waiting</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className="panel" style={{ maxWidth: 560 }}>
        <h2>{spaces.length ? "New space" : "Create your first space"}</h2>
        <ActionForm action={createSpace} className="stack">
          <div className="field"><label htmlFor="name">Business or product name</label><input id="name" name="name" required maxLength={80} placeholder="Riverside Dental" /></div>
          <div className="field">
            <label htmlFor="slug">Link address</label>
            <input id="slug" name="slug" required pattern="[a-zA-Z0-9][a-zA-Z0-9\-]{1,38}[a-zA-Z0-9]" placeholder="riverside-dental" />
            <p className="muted small">Your collect link will be /c/riverside-dental</p>
          </div>
          <div className="field"><label htmlFor="question">The question you ask</label><input id="question" name="question" defaultValue="How did we help you?" maxLength={200} /></div>
          <input type="hidden" name="thankYou" value="Thank you! Your words mean a lot." />
          <input type="hidden" name="accent" value="#4f46e5" />
          <Submit>Create space</Submit>
        </ActionForm>
      </div>
    </div>
  );
}

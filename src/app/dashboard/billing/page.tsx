import { requireUser } from "@/lib/auth";
import { isCloud, limits, PLANS, type Plan } from "@/lib/plans";
import { billingEnabled } from "@/lib/stripe";
import { openPortal, startCheckout } from "../../actions";

export const metadata = { title: "Billing" };

const PERKS: Record<Plan, string[]> = {
  free: ["1 space", "15 testimonials", "Wall, carousel and badge widgets"],
  pro: ["3 spaces", "Unlimited testimonials", "Photo and video testimonials", "No Laudwall badge", "API + MCP server"],
  agency: ["Unlimited spaces", "Everything in Pro", "For studios running client sites"],
};

export default async function Billing({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const user = await requireUser();
  const { done } = await searchParams;
  if (!isCloud()) {
    return (
      <div className="panel" style={{ maxWidth: 560 }}>
        <h1>Billing</h1>
        <p className="muted">This is a self-hosted server: every feature is on and nothing is limited.</p>
      </div>
    );
  }
  const fmt = (n: number) => (n === Infinity ? "Unlimited" : String(n));
  const current = limits(user.plan);
  return (
    <div className="stack">
      <h1>Billing</h1>
      {done && <p className="ok">Thanks! Your plan updates as soon as Stripe confirms the payment, usually within seconds.</p>}
      <p className="muted">You're on <b>{current.name}</b>: {fmt(current.spaces)} space{current.spaces === 1 ? "" : "s"}, {fmt(current.testimonials).toLowerCase()} testimonials.</p>
      {!billingEnabled() && <p className="error">Payments aren't set up on this server yet.</p>}
      <div className="grid">
        {(Object.keys(PLANS) as Plan[]).map((p) => (
          <div key={p} className={`panel plan${p === user.plan ? " best" : ""}`}>
            <h3>{PLANS[p].name}</h3>
            <p className="price">${PLANS[p].price} <small>/month</small></p>
            <ul>{PERKS[p].map((x) => <li key={x}>{x}</li>)}</ul>
            <div style={{ marginTop: 16 }}>
              {p === user.plan ? <span className="pill approved">Your plan</span>
                : p === "free" ? <form action={openPortal}><button className="btn" disabled={!billingEnabled()}>Manage or cancel</button></form>
                : <form action={startCheckout.bind(null, p)}><button className="btn primary" disabled={!billingEnabled()}>Upgrade to {PLANS[p].name}</button></form>}
            </div>
          </div>
        ))}
      </div>
      {user.plan !== "free" && <form action={openPortal}><button className="btn">Invoices, card and cancellation</button></form>}
    </div>
  );
}

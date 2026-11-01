import Link from "next/link";
import { Header } from "@/components/bits";
import { currentUser } from "@/lib/auth";

const STEPS = [
  ["Share one link", "Send customers your collect page. They write a few lines, pick a rating and tick consent. No account needed."],
  ["Approve in your inbox", "Nothing goes live until you approve it. Feature your best ones so they show first."],
  ["Embed anywhere", "Two lines of HTML give any site a wall, a carousel or a star badge that updates itself."],
];

const COMPARE: [string, string, string, string][] = [
  ["Price for unlimited testimonials", "Free self-hosted · $12/mo cloud", "$29–59/mo", "$25–50/mo"],
  ["Open source, self-hostable", "Yes (AGPL-3.0)", "No", "No"],
  ["Your data in one SQLite file", "Yes", "No", "No"],
  ["REST API", "Yes", "Higher plans", "Higher plans"],
  ["MCP server for AI agents", "Yes", "No", "No"],
  ["Webhooks (Slack, Zapier, n8n)", "Yes", "Higher plans", "Higher plans"],
];

const PLANS = [
  { name: "Self-hosted", price: "$0", per: "forever", items: ["Everything, unlimited", "One Docker container", "Your data never leaves your server"], cta: "Self-host it", href: "#self-host" },
  { name: "Cloud Pro", price: "$12", per: "/month", items: ["Unlimited testimonials", "3 spaces", "Photo and video testimonials", "No Laudwall badge", "API + MCP"], cta: "Start free", href: "/signup", best: true },
  { name: "Cloud Agency", price: "$39", per: "/month", items: ["Unlimited spaces", "White-label collect pages", "For studios running client sites"], cta: "Start free", href: "/signup" },
];

export default async function Home() {
  const user = await currentUser();
  return (
    <>
      <Header user={user} />
      <main className="wrap">
        <section className="hero">
          <p className="pill" style={{ marginBottom: 16 }}>Open source · API · MCP server</p>
          <h1>The testimonial wall you own, and your AI agent can use</h1>
          <p>Collect testimonials with a link, approve them in one inbox, and embed them on any website. Free to self-host. No $50-a-month bill for a form and a widget.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn primary" href={user ? "/dashboard" : "/signup"}>{user ? "Go to your spaces" : "Start free"}</Link>
            <a className="btn" href="#agents">See the agent part</a>
          </div>
        </section>

        <section className="grid" style={{ marginBottom: 56 }}>
          {STEPS.map(([title, text], i) => (
            <div key={title} className="panel"><p className="pill">Step {i + 1}</p><h2 style={{ marginTop: 10 }}>{title}</h2><p className="muted">{text}</p></div>
          ))}
        </section>

        <section id="agents" className="panel" style={{ marginBottom: 56 }}>
          <h2>Built for AI agents too</h2>
          <p className="muted">Laudwall ships an MCP server. Connect it to Claude and ask for things in plain words:</p>
          <pre>{`“Put our five best testimonials that mention speed on the pricing page.”
“Approve the new testimonials that rate us 4 stars or more, and feature the best one.”
“Give me the carousel embed code for Riverside Dental.”`}</pre>
          <p className="muted small">Same as the REST API: every action an agent takes goes through your API key, and you can revoke it any time.</p>
        </section>

        <section style={{ marginBottom: 56, overflowX: "auto" }}>
          <h2>How it compares</h2>
          <table className="panel" style={{ padding: 0 }}>
            <thead><tr><th /><th>Laudwall</th><th>Senja</th><th>Testimonial.to</th></tr></thead>
            <tbody>{COMPARE.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} style={i === 1 ? { fontWeight: 600 } : undefined}>{c}</td>)}</tr>)}</tbody>
          </table>
          <p className="muted small">Competitor prices from public listings, Oct 2026. They change; check before you compare.</p>
        </section>

        <section id="pricing" style={{ marginBottom: 40 }}>
          <h2>Pricing</h2>
          <p className="muted">Cloud plans are in early access: sign up free now, pick a plan when billing opens.</p>
          <div className="grid">
            {PLANS.map((p) => (
              <div key={p.name} className={`panel plan${p.best ? " best" : ""}`}>
                <h3>{p.name}</h3>
                <p className="price">{p.price} <small>{p.per}</small></p>
                <ul>{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
                <Link className={`btn${p.best ? " primary" : ""}`} href={p.href} style={{ marginTop: 16, width: "100%" }}>{p.cta}</Link>
              </div>
            ))}
          </div>
        </section>
        <section id="self-host" className="panel" style={{ marginBottom: 56 }}>
          <h2>Self-host in one command</h2>
          <p className="muted">One container, one SQLite file. Back up the <code>data</code> folder and you have everything.</p>
          <pre>{`docker compose up -d        # then open http://localhost:3051`}</pre>
        </section>
      </main>
      <footer>Laudwall · open source under AGPL-3.0</footer>
    </>
  );
}

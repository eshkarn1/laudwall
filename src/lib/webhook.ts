import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { appUrl } from "./api";
import type { Space, Testimonial } from "./store";

// Tell Slack, Zapier, n8n or your own code about a new testimonial. The body works as-is for a Slack incoming
// webhook ("text") and carries the full testimonial for everything else.

function privateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return privateIp(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

/** '' when the URL is a public https address; otherwise why not. Checked again at send time (DNS can change). */
export async function webhookProblem(url: string): Promise<string> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "That isn't a URL";
  }
  if (u.protocol !== "https:") return "Webhook URLs must start with https://";
  if (process.env.LAUDWALL_ALLOW_PRIVATE_WEBHOOKS === "on") return "";
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return "Webhooks can't point at a private address";
  try {
    const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (addrs.some((a) => privateIp(a.address))) return "Webhooks can't point at a private address";
  } catch {
    return "That address doesn't resolve";
  }
  return "";
}

export function webhookBody(space: Space, t: Testimonial) {
  const stars = "★".repeat(t.rating) + "☆".repeat(5 - t.rating);
  return {
    event: "testimonial.created",
    text: `New testimonial for ${space.name} ${stars}\n“${t.body}”\n— ${t.author}${t.role ? `, ${t.role}` : ""}\nReview it: ${appUrl()}/dashboard/${space.slug}`,
    space: { slug: space.slug, name: space.name },
    testimonial: { id: t.id, author: t.author, role: t.role, body: t.body, rating: t.rating, status: t.status, created_at: t.created_at,
      photo: t.photo ? `${appUrl()}/media/${t.photo}` : null, video: t.video ? `${appUrl()}/media/${t.video}` : null },
  };
}

/** Fire and forget: a slow or broken webhook never blocks or fails the person submitting. */
export function notify(space: Space, t: Testimonial, fetchImpl: typeof fetch = fetch): Promise<void> {
  if (!space.webhook_url) return Promise.resolve();
  return webhookProblem(space.webhook_url)
    .then((problem) => {
      if (problem) return;
      return fetchImpl(space.webhook_url, {
        method: "POST", headers: { "content-type": "application/json", "user-agent": "Laudwall-Webhook/1" },
        body: JSON.stringify(webhookBody(space, t)), signal: AbortSignal.timeout(5000), redirect: "manual",
      }).then(() => undefined);
    })
    .catch(() => undefined);
}

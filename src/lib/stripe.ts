import { createHmac, timingSafeEqual } from "node:crypto";
import { appUrl } from "./api";
import { isPlan, type Plan } from "./plans";
import { setPlan, stripeCustomerOf, userByStripeCustomer, type User } from "./store";

// Billing for the hosted cloud, over Stripe's plain REST API (no SDK). Needs STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
// STRIPE_PRICE_PRO and STRIPE_PRICE_AGENCY. Without them, billing is simply off.
const price = (plan: Plan) => (plan === "pro" ? process.env.STRIPE_PRICE_PRO : plan === "agency" ? process.env.STRIPE_PRICE_AGENCY : undefined);

export const billingEnabled = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_PRO && process.env.STRIPE_PRICE_AGENCY);

async function stripe(path: string, form: Record<string, string>, fetchImpl: typeof fetch = fetch): Promise<{ url: string }> {
  const res = await fetchImpl(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Stripe error ${res.status}`);
  return data;
}

export async function checkoutUrl(user: User, plan: Plan, fetchImpl?: typeof fetch): Promise<string> {
  const customer = stripeCustomerOf(user.id);
  const form: Record<string, string> = {
    mode: "subscription", "line_items[0][price]": price(plan)!, "line_items[0][quantity]": "1",
    success_url: `${appUrl()}/dashboard/billing?done=1`, cancel_url: `${appUrl()}/dashboard/billing`,
    client_reference_id: String(user.id), "metadata[plan]": plan,
    "subscription_data[metadata][plan]": plan, "subscription_data[metadata][user_id]": String(user.id),
    ...(customer ? { customer } : { customer_email: user.email }),
  };
  return (await stripe("/checkout/sessions", form, fetchImpl)).url;
}

export async function portalUrl(userId: number, fetchImpl?: typeof fetch): Promise<string | null> {
  const customer = stripeCustomerOf(userId);
  if (!customer) return null;
  return (await stripe("/billing_portal/sessions", { customer, return_url: `${appUrl()}/dashboard/billing` }, fetchImpl)).url;
}

/** Stripe's webhook signature: HMAC-SHA256 of "<timestamp>.<raw body>", within 5 minutes. */
export function verifySignature(payload: string, header: string | null, secret: string, now = Date.now()): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(now / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return header.split(",").filter((kv) => kv.startsWith("v1=")).some((kv) => {
    const sig = Buffer.from(kv.slice(3), "hex");
    return sig.length === expected.length && timingSafeEqual(sig, expected);
  });
}

type Event = { type: string; data: { object: Record<string, unknown> & { metadata?: Record<string, string> } } };

/** Keep each account's plan in step with its subscription. */
export function applyEvent(event: Event): void {
  const o = event.data.object;
  const plan = o.metadata?.plan ?? "";
  if (event.type === "checkout.session.completed") {
    const userId = Number(o.client_reference_id);
    if (userId && isPlan(plan)) setPlan(userId, plan, String(o.customer ?? "") || undefined);
    return;
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const userId = Number(o.metadata?.user_id) || userByStripeCustomer(String(o.customer ?? ""));
    if (!userId) return;
    const live = event.type === "customer.subscription.updated" && ["active", "trialing", "past_due"].includes(String(o.status));
    setPlan(userId, live && isPlan(plan) ? plan : "free");
  }
}

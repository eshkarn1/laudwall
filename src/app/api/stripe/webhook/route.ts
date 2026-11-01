import { applyEvent, billingEnabled, verifySignature } from "@/lib/stripe";

export async function POST(req: Request) {
  if (!billingEnabled()) return new Response("Billing is off", { status: 404 });
  const payload = await req.text();
  if (!verifySignature(payload, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET!)) {
    return new Response("Bad signature", { status: 400 });
  }
  applyEvent(JSON.parse(payload));
  return Response.json({ received: true });
}

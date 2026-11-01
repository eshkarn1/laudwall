// Plans only bite on the hosted cloud (LAUDWALL_CLOUD=on). A self-hosted server is unlimited, with every feature.
export type Plan = "free" | "pro" | "agency";
export type Limits = { name: string; spaces: number; testimonials: number; whiteLabel: boolean; api: boolean; media: boolean };

export const PLANS: Record<Plan, Limits & { price: number }> = {
  free: { name: "Free", price: 0, spaces: 1, testimonials: 15, whiteLabel: false, api: false, media: false },
  pro: { name: "Pro", price: 12, spaces: 3, testimonials: Infinity, whiteLabel: true, api: true, media: true },
  agency: { name: "Agency", price: 39, spaces: Infinity, testimonials: Infinity, whiteLabel: true, api: true, media: true },
};

const UNLIMITED: Limits = { name: "Self-hosted", spaces: Infinity, testimonials: Infinity, whiteLabel: true, api: true, media: true };

export const isCloud = () => process.env.LAUDWALL_CLOUD === "on";

export function limits(plan: string): Limits {
  return isCloud() ? (PLANS[plan as Plan] ?? PLANS.free) : UNLIMITED;
}

export const isPlan = (p: string): p is Plan => p in PLANS;

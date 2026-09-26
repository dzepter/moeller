"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { referralLinkSchema, referralDirectSchema, referralSelfSchema } from "@/lib/validation";
import { createReferralLink, createDirectReferral, completeReferralSelf } from "@/server/referrals";
import { rateLimit, requestIpHash } from "@/lib/rate-limit";
import { env } from "@/lib/env";

export type ReferralState = {
  errors?: Record<string, string>;
  formError?: string;
  /** Variante A: erzeugter Link */
  link?: string;
  code?: string;
} | null;

function zodErrors(issues: Array<{ path: PropertyKey[]; message: string }>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0]?.toString() ?? "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export async function createReferralLinkAction(_prev: ReferralState, formData: FormData): Promise<ReferralState> {
  const hdrs = await headers();
  const rl = await rateLimit({ key: `referral:${requestIpHash(hdrs)}`, limit: 5, windowSeconds: 600, blockSeconds: 900 });
  if (!rl.ok) return { formError: "Zu viele Versuche. Bitte warte kurz." };

  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const parsed = referralLinkSchema.safeParse(raw);
  if (!parsed.success) return { errors: zodErrors(parsed.error.issues) };
  if (parsed.data.website) return { link: `${env.baseUrl}/empfehlen/XXXX`, code: "XXXX" }; // Honeypot

  const referral = await createReferralLink(parsed.data);
  return { link: `${env.baseUrl}/empfehlen/${referral.code}`, code: referral.code ?? "" };
}

export async function createDirectReferralAction(_prev: ReferralState, formData: FormData): Promise<ReferralState> {
  const hdrs = await headers();
  const rl = await rateLimit({ key: `referral:${requestIpHash(hdrs)}`, limit: 5, windowSeconds: 600, blockSeconds: 900 });
  if (!rl.ok) return { formError: "Zu viele Versuche. Bitte warte kurz." };

  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const parsed = referralDirectSchema.safeParse(raw);
  if (!parsed.success) return { errors: zodErrors(parsed.error.issues) };
  if (parsed.data.website) redirect("/empfehlen/danke");

  try {
    await createDirectReferral(parsed.data);
  } catch {
    return { formError: "Das hat leider nicht geklappt. Bitte versuch es erneut." };
  }
  redirect("/empfehlen/danke");
}

export async function completeReferralSelfAction(_prev: ReferralState, formData: FormData): Promise<ReferralState> {
  const hdrs = await headers();
  const rl = await rateLimit({ key: `referral:${requestIpHash(hdrs)}`, limit: 5, windowSeconds: 600, blockSeconds: 900 });
  if (!rl.ok) return { formError: "Zu viele Versuche. Bitte warte kurz." };

  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const parsed = referralSelfSchema.safeParse(raw);
  if (!parsed.success) return { errors: zodErrors(parsed.error.issues) };
  if (parsed.data.website) redirect("/empfehlen/danke");

  try {
    await completeReferralSelf(parsed.data);
  } catch (err) {
    return { formError: err instanceof Error ? err.message : "Das hat leider nicht geklappt." };
  }
  redirect("/empfehlen/danke");
}

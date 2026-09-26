"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { applicationSchema, tooFast } from "@/lib/validation";
import { submitApplication } from "@/server/applications";
import { rateLimit, requestIpHash } from "@/lib/rate-limit";
import { MAX_UPLOAD_BYTES } from "@/lib/storage";

export type ApplyState = {
  errors?: Record<string, string>;
  formError?: string;
} | null;

export async function applyAction(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const hdrs = await headers();
  const ipHash = requestIpHash(hdrs);
  const rl = await rateLimit({ key: `apply:${ipHash}`, limit: 5, windowSeconds: 600, blockSeconds: 900 });
  if (!rl.ok) {
    return { formError: "Zu viele Versuche. Bitte warte einen Moment und versuch es dann erneut." };
  }

  const raw = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;

  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }

  // Anti-Spam: Honeypot + Zeitfalle → freundlich "annehmen", aber verwerfen
  if (parsed.data.website || tooFast(parsed.data.startedAt)) {
    redirect("/danke");
  }

  // Optionaler Lebenslauf
  let cv: { name: string; data: Buffer } | null = null;
  const file = formData.get("cv");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return { errors: { cv: "Die Datei ist größer als 10 MB." } };
    }
    cv = { name: file.name, data: Buffer.from(await file.arrayBuffer()) };
  }

  try {
    await submitApplication(parsed.data, { cv });
  } catch (err) {
    return {
      formError:
        err instanceof Error && err.message.length < 200
          ? err.message
          : "Das hat leider nicht geklappt. Bitte versuch es erneut oder ruf uns an: 06725 / 919350.",
    };
  }
  redirect("/danke");
}

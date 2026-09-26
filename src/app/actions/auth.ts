"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword, validatePasswordPolicy } from "@/lib/auth/password";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  getSession,
  completeMfa,
  revokeSession,
  revokeAllSessions,
} from "@/lib/auth/session";
import { verifyTotp, consumeRecoveryCode, generateMfaSecret, buildOtpAuthUrl, generateRecoveryCodes } from "@/lib/auth/mfa";
import { rateLimit, requestIpHash } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { generateToken, hashToken } from "@/lib/crypto";
import { sendMail } from "@/lib/email";
import { tplPasswortReset } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { getCurrentUser } from "@/lib/rbac";
import { consumePasswordReset } from "@/lib/auth/password-reset";

export type AuthState = { error?: string } | null;

const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const hdrs = await headers();
  const ipHash = requestIpHash(hdrs);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Bitte E-Mail und Passwort eingeben." };
  const email = parsed.data.email.toLowerCase();

  const rlIp = await rateLimit({ key: `login:ip:${ipHash}`, limit: 20, windowSeconds: 900, blockSeconds: 900 });
  const rlUser = await rateLimit({ key: `login:user:${email}`, limit: 10, windowSeconds: 900, blockSeconds: 900 });
  if (!rlIp.ok || !rlUser.ok) {
    return { error: "Zu viele Anmeldeversuche. Bitte warte 15 Minuten." };
  }

  const user = await db.user.findUnique({ where: { email } });
  const valid = user?.active ? await verifyPassword(user.passwordHash, parsed.data.password) : false;
  if (!user || !valid) {
    await audit({ action: "auth.login.failed", actorType: "SYSTEM", ipHash, meta: { emailHash: hashToken(email).slice(0, 12) } });
    return { error: "E-Mail oder Passwort ist nicht korrekt." };
  }

  const mfaRequired = Boolean(user.mfaEnabledAt);
  const { token } = await createSession(user.id, {
    mfaPending: mfaRequired,
    userAgent: hdrs.get("user-agent"),
  });
  await setSessionCookie(token);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ action: "auth.login", actorId: user.id, ipHash, meta: { mfa: mfaRequired } });

  if (mfaRequired) redirect("/admin/login/mfa");
  if (user.mustChangePassword) redirect("/admin/passwort-aendern");

  // MFA-Pflicht für Administratoren: ohne eingerichtete MFA direkt zur Einrichtung
  const mfaForAdmins = await getSetting("security.mfaRequiredForAdmins");
  if (mfaForAdmins && !user.mfaEnabledAt) {
    const roles = await db.userRole.findMany({ where: { userId: user.id }, include: { role: true } });
    if (roles.some((r) => r.role.key === "ADMINISTRATOR")) redirect("/admin/sicherheit?pflicht=1");
  }
  redirect("/admin");
}

const mfaSchema = z.object({ code: z.string().trim().min(6).max(12) });

export async function mfaAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!session.mfaPending) redirect("/admin");

  const hdrs = await headers();
  const rl = await rateLimit({ key: `mfa:${session.userId}`, limit: 10, windowSeconds: 900, blockSeconds: 900 });
  if (!rl.ok) return { error: "Zu viele Versuche. Bitte warte 15 Minuten." };

  const parsed = mfaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Bitte gib den 6-stelligen Code ein." };
  const code = parsed.data.code;

  let ok = false;
  if (session.user.mfaSecretEnc && /^\d{6}$/.test(code.replace(/\s/g, ""))) {
    ok = verifyTotp(session.user.mfaSecretEnc, code);
  }
  if (!ok && code.length >= 10) {
    ok = await consumeRecoveryCode(session.userId, code);
  }
  if (!ok) {
    await audit({ action: "auth.login.failed", actorId: session.userId, ipHash: requestIpHash(hdrs), meta: { step: "mfa" } });
    return { error: "Der Code ist nicht gültig." };
  }
  await completeMfa(session.id);
  if (session.user.mustChangePassword) redirect("/admin/passwort-aendern");
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  if (session) {
    await revokeSession(session.id);
    await audit({ action: "auth.logout", actorId: session.userId });
  }
  await clearSessionCookie();
  redirect("/admin/login");
}

export async function logoutAllAction(): Promise<void> {
  const session = await getSession();
  if (session) {
    await revokeAllSessions(session.userId);
    await audit({ action: "auth.logout.all", actorId: session.userId });
  }
  await clearSessionCookie();
  redirect("/admin/login");
}

// ---------- Passwort ändern ----------

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1).max(200),
  confirm: z.string().min(1).max(200),
});

export async function changePasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const session = await getSession();
  if (!session || session.mfaPending) redirect("/admin/login");

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Bitte alle Felder ausfüllen." };
  if (parsed.data.newPassword !== parsed.data.confirm) {
    return { error: "Die neuen Passwörter stimmen nicht überein." };
  }
  const policyError = validatePasswordPolicy(parsed.data.newPassword);
  if (policyError) return { error: policyError };

  const valid = await verifyPassword(session.user.passwordHash, parsed.data.currentPassword);
  if (!valid) return { error: "Das aktuelle Passwort ist nicht korrekt." };

  await db.user.update({
    where: { id: session.userId },
    data: { passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false },
  });
  await revokeAllSessions(session.userId, session.id);
  await audit({ action: "auth.password.changed", actorId: session.userId });
  redirect("/admin");
}

// ---------- Passwort-Reset ----------

export async function requestPasswordResetAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const hdrs = await headers();
  const rl = await rateLimit({ key: `pwreset:${requestIpHash(hdrs)}`, limit: 5, windowSeconds: 900, blockSeconds: 900 });
  if (!rl.ok) return { error: "Zu viele Anfragen. Bitte warte 15 Minuten." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email) {
    const user = await db.user.findUnique({ where: { email } });
    if (user?.active) {
      const token = generateToken();
      await db.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });
      const mail = tplPasswortReset({ name: user.name, link: `${env.baseUrl}/admin/passwort-reset/${token}` });
      await sendMail({ to: user.email, subject: mail.subject, text: mail.text, template: "passwort-reset" });
      await audit({ action: "auth.password.reset.requested", actorId: user.id });
    }
  }
  // Enumeration-sicher: immer dieselbe Antwort
  return { error: "" };
}

export async function completePasswordResetAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (newPassword !== confirm) return { error: "Die Passwörter stimmen nicht überein." };
  const policyError = validatePasswordPolicy(newPassword);
  if (policyError) return { error: policyError };

  // Atomarer, concurrency-sicherer Verbrauch (genau eine erfolgreiche Nutzung
  // pro Token, auch bei parallelen Requests) – Logik in lib/auth/password-reset.
  const result = await consumePasswordReset(token, newPassword);
  if (!result.ok) return { error: result.error };
  redirect("/admin/login?reset=ok");
}

// ---------- MFA-Verwaltung ----------

export type MfaSetupState = {
  error?: string;
  otpAuthUrl?: string;
  qrDataUrl?: string;
  manualCode?: string;
  secretEnc?: string;
  recoveryCodes?: string[];
} | null;

export async function startMfaSetupAction(): Promise<MfaSetupState> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const { secret, encrypted } = generateMfaSecret();
  const otpAuthUrl = buildOtpAuthUrl(user.email, secret);
  const { default: QRCode } = await import("qrcode");
  const qrDataUrl = await QRCode.toDataURL(otpAuthUrl, { width: 220, margin: 1 });
  return { otpAuthUrl, qrDataUrl, manualCode: secret, secretEnc: encrypted };
}

export async function confirmMfaSetupAction(_prev: MfaSetupState, formData: FormData): Promise<MfaSetupState> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const secretEnc = String(formData.get("secretEnc") ?? "");
  const code = String(formData.get("code") ?? "");
  const otpAuthUrl = String(formData.get("otpAuthUrl") ?? "");
  if (!secretEnc || !verifyTotp(secretEnc, code)) {
    return { error: "Der Code ist nicht gültig. Bitte prüfe die Uhrzeit Deines Geräts.", secretEnc, otpAuthUrl };
  }
  const { plain, hashes } = generateRecoveryCodes();
  await db.user.update({
    where: { id: user.id },
    data: { mfaSecretEnc: secretEnc, mfaEnabledAt: new Date(), recoveryCodeHashes: hashes },
  });
  await audit({ action: "auth.mfa.enabled", actorId: user.id });
  return { recoveryCodes: plain };
}

export async function disableMfaAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const session = await getSession();
  if (!session || session.mfaPending) redirect("/admin/login");
  const password = String(formData.get("password") ?? "");
  if (!(await verifyPassword(session.user.passwordHash, password))) {
    return { error: "Das Passwort ist nicht korrekt." };
  }
  const mfaForAdmins = await getSetting("security.mfaRequiredForAdmins");
  if (mfaForAdmins) {
    const roles = await db.userRole.findMany({ where: { userId: session.userId }, include: { role: true } });
    if (roles.some((r) => r.role.key === "ADMINISTRATOR")) {
      return { error: "Für Administratoren ist die Zwei-Faktor-Anmeldung verpflichtend." };
    }
  }
  await db.user.update({
    where: { id: session.userId },
    data: { mfaSecretEnc: null, mfaEnabledAt: null, recoveryCodeHashes: [] },
  });
  await audit({ action: "auth.mfa.disabled", actorId: session.userId });
  return { error: "" };
}

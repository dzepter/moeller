import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getOperationalLock } from "@/lib/rbac";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Anmeldung – Möller Intern",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getSessionUser();
  if (user) {
    const lock = await getOperationalLock(user);
    if (lock === "PASSWORT_WECHSEL") redirect("/admin/passwort-aendern");
    if (lock === "MFA_EINRICHTUNG") redirect("/admin/sicherheit?pflicht=1");
    redirect("/admin");
  }
  const params = await searchParams;
  return <LoginForm resetOk={params.reset === "ok"} />;
}

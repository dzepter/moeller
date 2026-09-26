import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = {
  title: "Zwei-Faktor-Bestätigung – Möller Intern",
  robots: { index: false, follow: false },
};

export default async function MfaPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!session.mfaPending) redirect("/admin");
  return <MfaForm />;
}

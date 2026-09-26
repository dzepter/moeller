import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ChangeForm } from "./change-form";

export const metadata: Metadata = {
  title: "Passwort ändern – Möller Intern",
  robots: { index: false, follow: false },
};

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.mfaPending) redirect("/admin/login/mfa");
  return <ChangeForm forced={session.user.mustChangePassword} />;
}

import type { Metadata } from "next";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Neues Passwort – Möller Intern",
  robots: { index: false, follow: false },
};

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResetForm token={token} />;
}

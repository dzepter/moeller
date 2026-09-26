import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Passwort vergessen – Möller Intern",
  robots: { index: false, follow: false },
};

export default function ForgotPage() {
  return <ForgotForm />;
}

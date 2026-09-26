import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Anmeldung – Möller Intern",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (user) redirect("/admin");
  const params = await searchParams;
  return <LoginForm resetOk={params.reset === "ok"} />;
}

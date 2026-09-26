import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { getCurrentUser, hasPermission, type PermissionKey } from "@/lib/rbac";
import { getSetting } from "@/lib/settings";
import { AdminNav, type NavItem } from "@/components/admin/nav";
import { logoutAction } from "@/app/actions/auth";
import { initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: { default: "Möller Intern", template: "%s – Möller Intern" },
  robots: { index: false, follow: false },
};

const NAV_DEF: Array<NavItem & { permission?: PermissionKey | PermissionKey[] }> = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/bewerbungen", label: "Bewerbungen", permission: ["candidates.read.all", "candidates.read.regional"] },
  { href: "/admin/wiedervorlagen", label: "Wiedervorlagen", permission: "candidates.write" },
  { href: "/admin/stellen", label: "Stellen", permission: "jobs.manage" },
  { href: "/admin/empfehlungen", label: "Empfehlungen", permission: "referrals.manage" },
  { href: "/admin/chats", label: "Chats", permission: "chat.manage" },
  { href: "/admin/academy", label: "Academy", permission: ["academy.manageParticipants", "academy.viewRegional"] },
  { href: "/admin/website", label: "Website", permission: "cms.editContent" },
  { href: "/admin/medien", label: "Medien", permission: "media.manage" },
  { href: "/admin/vertretungen", label: "Vertretungen", permission: ["delegations.self", "delegations.manage"] },
  { href: "/admin/reporting", label: "Reporting", permission: "reporting.view" },
  { href: "/admin/benutzer", label: "Benutzer", permission: "users.manage" },
  { href: "/admin/datenschutz", label: "Datenschutz", permission: "privacy.manage" },
  { href: "/admin/audit", label: "Audit-Log", permission: "audit.view" },
  { href: "/admin/einstellungen", label: "Einstellungen", permission: "settings.manage" },
  { href: "/admin/sicherheit", label: "Mein Konto" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.mfaPending) redirect("/admin/login/mfa");
  if (session.user.mustChangePassword) redirect("/admin/passwort-aendern");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  // Zentrales MFA-Pflicht-Gate: Administratoren ohne eingerichtete MFA
  // erreichen ausschließlich die Einrichtungsseite (und deren Actions/Logout).
  // Die Prüfung liegt im Layout, damit auch direkt aufgerufene /admin/…-URLs
  // erfasst sind; der Pfad kommt aus der Middleware (x-pathname).
  if (!user.mfaEnabled && user.roleKeys.includes("ADMINISTRATOR")) {
    const mfaForAdmins = await getSetting("security.mfaRequiredForAdmins");
    if (mfaForAdmins) {
      const pathname = (await headers()).get("x-pathname");
      if (pathname !== null && !pathname.startsWith("/admin/sicherheit")) {
        redirect("/admin/sicherheit?pflicht=1");
      }
    }
  }

  const items = NAV_DEF.filter((item) => {
    if (!item.permission) return true;
    const perms = Array.isArray(item.permission) ? item.permission : [item.permission];
    return perms.some((p) => hasPermission(user, p));
  }).map(({ href, label, exact }) => ({ href, label, exact }));

  return (
    <div className="min-h-dvh bg-paper-warm lg:grid lg:grid-cols-[15rem_1fr]">
      <AdminNav items={items} userName={user.name} userInitials={initials(user.name)} logout={logoutAction} />
      <div className="min-w-0">
        <main className="p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

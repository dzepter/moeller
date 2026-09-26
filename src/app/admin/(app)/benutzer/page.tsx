import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { PageHeader, Card, Badge } from "@/components/admin/ui";
import { UserCreateForm, UserEditRow } from "@/components/admin/user-widgets";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Benutzer" };

export default async function BenutzerPage() {
  await requirePermission("users.manage");
  const [users, roles, regions] = await Promise.all([
    db.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { roles: { include: { role: true } }, region: true },
    }),
    db.role.findMany({ orderBy: { name: "asc" } }),
    db.region.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Benutzer & Rollen"
        description="Zugänge für Geschäftsführung, Innendienst und Teamleiter. Berechtigungen hängen an Rollen, nicht an Namen."
      />

      <Card title="Neuen Benutzer anlegen" className="mb-5">
        <UserCreateForm
          roles={roles.map((r) => ({ id: r.id, name: r.name }))}
          regions={regions.map((r) => ({ id: r.id, name: r.name }))}
        />
      </Card>

      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="border border-line bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-display font-bold text-ink">
                  {u.name} {!u.active ? <Badge tone="red">deaktiviert</Badge> : null}{" "}
                  {u.mfaEnabledAt ? <Badge tone="green">2FA aktiv</Badge> : <Badge tone="neutral">ohne 2FA</Badge>}
                </p>
                <p className="text-sm text-ink-mute">
                  {u.email} · letzter Login: {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "noch nie"}
                </p>
              </div>
              <Badge tone="blue">{u.roles.map((r) => r.role.name).join(", ") || "ohne Rolle"}</Badge>
            </div>
            <UserEditRow
              user={{
                id: u.id,
                name: u.name,
                roleId: u.roles[0]?.roleId ?? "",
                regionId: u.regionId ?? "",
                active: u.active,
              }}
              roles={roles.map((r) => ({ id: r.id, name: r.name }))}
              regions={regions.map((r) => ({ id: r.id, name: r.name }))}
            />
          </div>
        ))}
      </div>
    </>
  );
}

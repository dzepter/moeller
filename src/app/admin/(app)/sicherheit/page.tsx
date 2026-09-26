import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { getSession } from "@/lib/auth/session";
import { PageHeader, Card, Badge } from "@/components/admin/ui";
import { MfaSetup, DisableMfaForm } from "@/components/admin/mfa-widgets";
import { logoutAllAction } from "@/app/actions/auth";
import { ButtonLink, Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Mein Konto" };

export default async function SicherheitPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const session = await getSession();
  const sessions = await db.session.findMany({
    where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    take: 10,
  });

  return (
    <>
      <PageHeader title="Mein Konto & Sicherheit" description={`Angemeldet als ${user.name} (${user.email})`} />

      {params.pflicht ? (
        <p className="mb-4 border-l-2 border-accent bg-warn-wash px-4 py-3 text-sm">
          Für Administratoren ist die Zwei-Faktor-Anmeldung verpflichtend. Bitte richte sie jetzt ein.
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card
          title="Zwei-Faktor-Anmeldung (TOTP)"
          actions={user.mfaEnabled ? <Badge tone="green">aktiv</Badge> : <Badge tone="yellow">nicht eingerichtet</Badge>}
        >
          {user.mfaEnabled ? (
            <div className="space-y-4">
              <p className="text-[0.95rem]">
                Deine Anmeldung ist mit einer Authenticator-App abgesichert. Zum Zurücksetzen (z. B.
                neues Handy) deaktiviere 2FA und richte sie danach neu ein.
              </p>
              <DisableMfaForm />
            </div>
          ) : (
            <MfaSetup />
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Passwort">
            <p className="text-[0.95rem]">Regelmäßig ändern schadet nie – besonders nach einem Gerätewechsel.</p>
            <div className="mt-3">
              <ButtonLink href="/admin/passwort-aendern" variant="outline" size="sm">
                Passwort ändern
              </ButtonLink>
            </div>
          </Card>

          <Card title="Aktive Sitzungen">
            <ul className="space-y-2 text-[0.9rem]">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 border-b border-line-soft pb-2 last:border-b-0">
                  <span className="truncate text-ink-mute">
                    {s.id === session?.id ? <strong className="text-ink">Diese Sitzung</strong> : (s.userAgent ?? "Unbekanntes Gerät")}
                  </span>
                  <span className="whitespace-nowrap text-xs text-ink-mute">zuletzt {formatDateTime(s.lastSeenAt)}</span>
                </li>
              ))}
            </ul>
            <form action={logoutAllAction} className="mt-4">
              <Button type="submit" variant="danger" size="sm">
                Alle Sitzungen abmelden (auch diese)
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

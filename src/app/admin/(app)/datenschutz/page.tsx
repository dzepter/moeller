import type { Metadata } from "next";
import { requirePermission } from "@/lib/rbac";
import { retentionPreview } from "@/server/retention";
import { getSetting } from "@/lib/settings";
import { PageHeader, Card, StatCard } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-widgets";
import { RetentionRunForm, SubjectSearch } from "@/components/admin/privacy-widgets";

export const metadata: Metadata = { title: "Datenschutz" };

export default async function DatenschutzPage() {
  await requirePermission("privacy.manage");
  const preview = await retentionPreview();
  const [rejected, completed, chat, referral] = await Promise.all([
    getSetting("retention.rejectedApplicationsDays"),
    getSetting("retention.completedApplicationsDays"),
    getSetting("retention.chatDays"),
    getSetting("retention.referralDays"),
  ]);

  return (
    <>
      <PageHeader
        title="Datenschutz & Aufbewahrung"
        description="Löschfristen konfigurieren, anstehende Löschungen prüfen, Betroffenenrechte unterstützen. Läuft zusätzlich automatisch einmal täglich."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Absagen zur Anonymisierung fällig" value={preview.rejected} tone="alert" />
        <StatCard label="Abgeschlossene Bewerbungen fällig" value={preview.completed} tone="alert" />
        <StatCard label="Chats fällig" value={preview.chats} tone="alert" />
        <StatCard label="Empfehlungen fällig" value={preview.referrals} tone="alert" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Aufbewahrungsfristen (Tage)">
          <SettingsForm
            section="retention"
            fields={[
              { name: "rejected", label: "Absagen", value: String(rejected), help: "Nach Ablauf werden Bewerbungsdaten anonymisiert." },
              { name: "completed", label: "Abgeschlossene Bewerbungen (Zusagen)", value: String(completed) },
              { name: "chat", label: "Chat-Unterhaltungen", value: String(chat) },
              { name: "referral", label: "Empfehlungen (abgeschlossen)", value: String(referral) },
            ]}
          />
          <p className="mt-3 text-xs text-ink-mute">
            Hinweis: Es sind bewusst keine juristischen Fristen hinterlegt – bitte mit rechtlicher
            Beratung festlegen. Löschvorgänge werden im Audit-Log protokolliert (nur Zähler, keine Inhalte).
          </p>
        </Card>

        <div className="space-y-5">
          <Card title="Anstehende Löschungen jetzt ausführen">
            <RetentionRunForm />
          </Card>
          <Card title="Betroffenenrechte: Person suchen">
            <SubjectSearch />
          </Card>
        </div>
      </div>
    </>
  );
}

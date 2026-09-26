import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getSetting } from "@/lib/settings";
import { PageHeader, Card } from "@/components/admin/ui";
import { SettingsForm, TeamMemberEditor } from "@/components/admin/settings-widgets";
import { runGoLiveChecks } from "@/server/golive";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function EinstellungenPage() {
  await requirePermission("settings.manage");

  const [
    phone,
    email,
    applicationEmail,
    whatsappNumber,
    address,
    hours,
    waBewerber,
    waUnternehmen,
    waAllgemein,
    notifApplications,
    notifReferrals,
    notifChat,
    reNotify,
    featTeam,
    featReferences,
    featFaq,
    featIncentives,
    featAnalytics,
    mfaRequired,
    academyValidity,
    academyPass,
    academyRemEnabled,
    academyRemStart,
    academyRemDone,
    appConsentVersion,
    appConsentText,
    refConsentVersion,
    refConsentText,
    teamMembers,
  ] = await Promise.all([
    getSetting("contact.phone"),
    getSetting("contact.email"),
    getSetting("contact.applicationEmail"),
    getSetting("contact.whatsappNumber"),
    getSetting("contact.address"),
    getSetting("contact.openingHours"),
    getSetting("whatsapp.text.bewerber"),
    getSetting("whatsapp.text.unternehmen"),
    getSetting("whatsapp.text.allgemein"),
    getSetting("notifications.applicationRecipients"),
    getSetting("notifications.referralRecipients"),
    getSetting("notifications.chatRecipients"),
    getSetting("chat.reNotifyAfterMinutes"),
    getSetting("features.teamSection"),
    getSetting("features.referencesPage"),
    getSetting("features.faqPage"),
    getSetting("features.referralIncentives"),
    getSetting("features.analytics"),
    getSetting("security.mfaRequiredForAdmins"),
    getSetting("academy.invitationValidityDays"),
    getSetting("academy.passScorePct"),
    getSetting("academy.reminders.enabled"),
    getSetting("academy.reminders.notStartedAfterDays"),
    getSetting("academy.reminders.notCompletedAfterDays"),
    getSetting("applications.consentVersion"),
    getSetting("applications.consentText"),
    getSetting("referrals.consentVersion"),
    getSetting("referrals.consentText"),
    db.teamMember.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const goLive = await runGoLiveChecks();

  return (
    <>
      <PageHeader
        title="Einstellungen"
        description="Zentrale Konfiguration: Kontakt, Öffnungszeiten, Benachrichtigungen, Features. Änderungen wirken sofort auf der Website."
      />
      <div className="space-y-5">
        {goLive.length > 0 ? (
          <section
            aria-labelledby="golive-h"
            className={`border p-4 ${goLive.some((f) => f.level === "BLOCKER") ? "border-danger bg-danger-wash" : "border-accent bg-warn-wash"}`}
          >
            <h2 id="golive-h" className="text-base font-bold text-ink">
              Go-Live-Check: {goLive.filter((f) => f.level === "BLOCKER").length} Blocker,{" "}
              {goLive.filter((f) => f.level === "WARNUNG").length} Warnungen
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Diese Punkte müssen vor dem Produktivstart erledigt bzw. bewusst entschieden sein. Rechtstexte werden
              nicht automatisch befüllt – die echten Angaben liefert die Geschäftsführung.
            </p>
            <ul className="mt-3 space-y-2">
              {goLive.map((f, i) => (
                <li key={i} className="text-sm">
                  <span className={`font-bold ${f.level === "BLOCKER" ? "text-danger" : "text-ink"}`}>{f.level}</span>{" "}
                  · <span className="font-semibold">{f.bereich}:</span> <span className="text-ink-soft">{f.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="border border-positive bg-positive-wash p-3 text-sm text-positive">
            Go-Live-Check: keine offenen Blocker oder Warnungen.
          </p>
        )}

        <Card title="Kontakt & Öffnungszeiten">
          <SettingsForm
            section="kontakt"
            fields={[
              { name: "phone", label: "Telefon", value: phone },
              { name: "email", label: "Allgemeine E-Mail", value: email },
              { name: "applicationEmail", label: "Bewerbungs-E-Mail", value: applicationEmail },
              { name: "whatsappNumber", label: "WhatsApp-Nummer (Ziffern, mit Ländervorwahl)", value: whatsappNumber, help: "Die Nummer muss bei WhatsApp Business registriert sein." },
              { name: "company", label: "Firmierung", value: address.company },
              { name: "street", label: "Straße", value: address.street },
              { name: "zip", label: "PLZ", value: address.zip },
              { name: "city", label: "Ort", value: address.city },
              { name: "hoursFrom", label: "Erreichbar von (HH:MM)", value: hours.windows[0]?.from ?? "08:00" },
              { name: "hoursTo", label: "Erreichbar bis (HH:MM)", value: hours.windows[hours.windows.length - 1]?.to ?? "17:00" },
              { name: "hoursLabel", label: "Anzeigetext Erreichbarkeit", value: hours.label, wide: true, help: "Verbindlich geklärt: Mo–Fr 08:00–17:00 Uhr durchgehend (die 09–12/13–17-Angabe der alten Schulungsunterlagen ist überholt)." },
            ]}
          />
        </Card>

        <Card title="WhatsApp-Textbausteine">
          <SettingsForm
            section="whatsapp"
            fields={[
              { name: "textBewerber", label: "Vorbereiteter Text – Bewerber", value: waBewerber, wide: true },
              { name: "textUnternehmen", label: "Vorbereiteter Text – Geschäftskunden", value: waUnternehmen, wide: true },
              { name: "textAllgemein", label: "Vorbereiteter Text – Allgemein", value: waAllgemein, wide: true },
            ]}
          />
        </Card>

        <Card title="E-Mail-Benachrichtigungen">
          <SettingsForm
            section="benachrichtigungen"
            fields={[
              { name: "applicationRecipients", label: "Empfänger neue Bewerbungen", value: notifApplications.join("\n"), textarea: true, help: "eine Adresse pro Zeile" },
              { name: "referralRecipients", label: "Empfänger neue Empfehlungen", value: notifReferrals.join("\n"), textarea: true },
              { name: "chatRecipients", label: "Empfänger neue Chats", value: notifChat.join("\n"), textarea: true },
              { name: "reNotify", label: "Chat: erneut benachrichtigen nach (Minuten ohne Reaktion)", value: String(reNotify) },
            ]}
          />
        </Card>

        <Card title="Website-Funktionen & Sicherheit">
          <SettingsForm
            section="features"
            checkboxes={[
              { name: "teamSection", label: "Team-Bereich auf „Über uns“ anzeigen", checked: featTeam },
              { name: "referencesPage", label: "Referenzen-Bereich aktivieren (vorbereitet)", checked: featReferences },
              { name: "faqPage", label: "FAQ-Bereich aktivieren (vorbereitet)", checked: featFaq },
              { name: "referralIncentives", label: "Referral-Incentive-Tracking im Admin anzeigen", checked: featIncentives },
              { name: "analytics", label: "Minimale, cookielose Ereigniszählung aktivieren", checked: featAnalytics },
              { name: "mfaRequired", label: "2FA für Administratoren verpflichtend", checked: mfaRequired },
            ]}
            fields={[]}
          />
        </Card>

        <Card title="Academy">
          <SettingsForm
            section="academy"
            fields={[
              { name: "validityDays", label: "Gültigkeit Einladungslinks (Tage)", value: String(academyValidity) },
              { name: "passScore", label: "Bestehensgrenze Wissenscheck (%)", value: String(academyPass) },
              { name: "notStarted", label: "Erinnerung nach X Tagen ohne Start", value: String(academyRemStart) },
              { name: "notCompleted", label: "Erinnerung nach X Tagen ohne Abschluss", value: String(academyRemDone) },
            ]}
            checkboxes={[{ name: "remindersEnabled", label: "Erinnerungs-E-Mails aktivieren", checked: academyRemEnabled }]}
          />
        </Card>

        <Card title="Einwilligungstexte (Consent)">
          <SettingsForm
            section="consent"
            fields={[
              { name: "appVersion", label: "Version Bewerbungs-Consent", value: appConsentVersion, help: "Bei inhaltlicher Änderung Version erhöhen." },
              { name: "appText", label: "Text Bewerbungs-Consent", value: appConsentText, textarea: true, wide: true },
              { name: "refVersion", label: "Version Empfehlungs-Consent", value: refConsentVersion },
              { name: "refText", label: "Text Empfehlungs-Consent", value: refConsentText, textarea: true, wide: true },
            ]}
          />
        </Card>

        <Card title="Team-Bereich (öffentlich, „Über uns“)">
          <TeamMemberEditor
            members={teamMembers.map((m) => ({
              id: m.id,
              name: m.name,
              role: m.role,
              bio: m.bio ?? "",
              active: m.active,
              sortOrder: m.sortOrder,
            }))}
          />
        </Card>
      </div>
    </>
  );
}

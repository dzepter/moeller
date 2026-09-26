/**
 * Seed: Kern-Daten (Regionen, Rollen, Permissions) + Demo-Daten für Entwicklung.
 * - Idempotent (Upserts) – mehrfach ausführbar.
 * - Keine hartcodierten Passwörter: SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD aus ENV,
 *   sonst Zufallspasswörter, die einmalig auf der Konsole ausgegeben werden.
 * - Demo-Daten (fiktive Bewerber etc.) nur außerhalb von production.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";

const db = new PrismaClient();

const PERMISSIONS: Record<string, string> = {
  "candidates.read.all": "Alle Bewerber sehen",
  "candidates.read.regional": "Bewerber der eigenen Region sehen",
  "candidates.write": "Bewerber bearbeiten (Status, Notizen, Wiedervorlagen)",
  "candidates.assign": "Bewerber umzuordnen",
  "candidates.export": "Bewerberdaten exportieren",
  "candidates.delete": "Bewerber löschen/anonymisieren",
  "jobs.manage": "Stellen erstellen, bearbeiten, veröffentlichen",
  "referrals.manage": "Empfehlungen bearbeiten",
  "chat.manage": "Chats bearbeiten",
  "cms.editContent": "Website-Inhalte bearbeiten",
  "cms.publish": "Website-Inhalte veröffentlichen",
  "media.manage": "Medienbibliothek verwalten",
  "academy.manageParticipants": "Academy-Teilnehmer verwalten",
  "academy.editContent": "Academy-Inhalte bearbeiten",
  "academy.viewRegional": "Academy-Fortschritt der eigenen Region sehen",
  "users.manage": "Benutzer & Rollen verwalten",
  "settings.manage": "Systemeinstellungen ändern",
  "delegations.manage": "Vertretungen für andere anlegen/ändern/beenden",
  "delegations.self": "Eigene Vertretung anlegen",
  "reporting.view": "Reporting einsehen",
  "reporting.export": "Reporting exportieren",
  "audit.view": "Audit-Log einsehen",
  "privacy.manage": "Datenschutz-Werkzeuge (Retention, Export, Löschung)",
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMINISTRATOR: Object.keys(PERMISSIONS),
  INNENDIENST: [
    "candidates.read.all",
    "candidates.write",
    "candidates.assign",
    "candidates.export",
    "jobs.manage",
    "referrals.manage",
    "chat.manage",
    "academy.manageParticipants",
    "academy.editContent",
    "academy.viewRegional",
    "delegations.manage",
    "delegations.self",
    "reporting.view",
    "reporting.export",
    // bewusst NICHT: cms.editContent/publish (Website-Marketinginhalte), users.manage,
    // settings.manage, audit.view, privacy.manage, media.manage
  ],
  TEAMLEITER: [
    "candidates.read.regional",
    "candidates.write",
    "academy.viewRegional",
    "delegations.self",
  ],
};

function randomPassword(): string {
  return randomBytes(9).toString("base64url") + "A1a";
}

async function main() {
  const isProd = process.env.NODE_ENV === "production";

  // ---------- Regionen ----------
  const regions: Record<string, string> = {};
  for (const [key, name] of [
    ["NRW", "Team Nordrhein-Westfalen"],
    ["HESSEN", "Team Hessen & Rheinland-Pfalz"],
    ["BAYERN", "Team Bayern"],
  ] as const) {
    const region = await db.region.upsert({ where: { key }, update: { name }, create: { key, name } });
    regions[key] = region.id;
  }

  // ---------- Permissions & Rollen ----------
  for (const [key, name] of Object.entries(PERMISSIONS)) {
    await db.permission.upsert({ where: { key }, update: { name }, create: { key, name } });
  }
  for (const [roleKey, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await db.role.upsert({
      where: { key: roleKey },
      update: {},
      create: {
        key: roleKey,
        name:
          roleKey === "ADMINISTRATOR"
            ? "Administrator / Geschäftsführer"
            : roleKey === "INNENDIENST"
              ? "Innendienst"
              : "Teamleiter",
        system: true,
      },
    });
    for (const pKey of permissionKeys) {
      const permission = await db.permission.findUniqueOrThrow({ where: { key: pKey } });
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  // ---------- Benutzer ----------
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || randomPassword();
  const userPassword = process.env.SEED_USER_PASSWORD || randomPassword();
  const printedCredentials: string[] = [];

  async function upsertUser(params: {
    email: string;
    name: string;
    roleKey: string;
    regionKey?: string;
    password: string;
    label: string;
  }) {
    const existing = await db.user.findUnique({ where: { email: params.email } });
    const role = await db.role.findUniqueOrThrow({ where: { key: params.roleKey } });
    if (existing) {
      await db.userRole.upsert({
        where: { userId_roleId: { userId: existing.id, roleId: role.id } },
        update: {},
        create: { userId: existing.id, roleId: role.id },
      });
      return existing;
    }
    const user = await db.user.create({
      data: {
        email: params.email,
        name: params.name,
        passwordHash: await hash(params.password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
        regionId: params.regionKey ? regions[params.regionKey] : null,
        mustChangePassword: true,
        roles: { create: { roleId: role.id } },
      },
    });
    printedCredentials.push(`${params.label}: ${params.email} / ${params.password}`);
    return user;
  }

  await upsertUser({ email: "markus@bvg-moeller.de", name: "Markus Möller", roleKey: "ADMINISTRATOR", password: adminPassword, label: "Administrator" });
  await upsertUser({ email: "jana@bvg-moeller.de", name: "Jana Talackova", roleKey: "INNENDIENST", password: userPassword, label: "Innendienst" });
  await upsertUser({ email: "jasmin@bvg-moeller.de", name: "Jasmin Mück", roleKey: "INNENDIENST", password: userPassword, label: "Innendienst" });
  await upsertUser({ email: "tl-nrw@bvg-moeller.de", name: "Teamleitung NRW (Demo)", roleKey: "TEAMLEITER", regionKey: "NRW", password: userPassword, label: "Teamleiter NRW" });
  await upsertUser({ email: "tl-hessen@bvg-moeller.de", name: "Teamleitung Hessen (Demo)", roleKey: "TEAMLEITER", regionKey: "HESSEN", password: userPassword, label: "Teamleiter Hessen" });
  await upsertUser({ email: "tl-bayern@bvg-moeller.de", name: "Teamleitung Bayern (Demo)", roleKey: "TEAMLEITER", regionKey: "BAYERN", password: userPassword, label: "Teamleiter Bayern" });

  // ---------- Team-Bereich (öffentlich, aktivierbar) ----------
  for (const [i, member] of [
    { name: "Jana Talackova", role: "Head of Administration", bio: "Seit 2005 die Stimme unseres Innendiensts – Jana kennt jeden Ablauf und (fast) jeden Promotor beim Vornamen." },
    { name: "Jasmin Mück", role: "Assistenz Innendienst", bio: "Verstärkt das Team seit 2011 und sorgt dafür, dass Abrechnungen, Zugänge und Planungen einfach laufen." },
  ].entries()) {
    const existing = await db.teamMember.findFirst({ where: { name: member.name } });
    if (!existing) {
      await db.teamMember.create({ data: { ...member, sortOrder: i } });
    }
  }

  // ---------- Demo-Jobs ----------
  const demoJobs = [
    {
      slug: "promotor-leh-nrw",
      title: "Promotor (m/w/d) Lebensmitteleinzelhandel",
      bundesland: "NRW" as const,
      city: "Raum Köln / Düsseldorf",
      einsatzbereich: "LEH" as const,
      employmentType: "VOLLZEIT" as const,
      intro:
        "Du präsentierst starke Marken direkt im Markt, kommst mit Kundinnen und Kunden ins Gespräch und sorgst dafür, dass Deine Fläche läuft – mit fester Ansprechperson und ordentlicher Einarbeitung.",
      tasks: [
        "Kunden am PoS freundlich ansprechen und beraten",
        "Produkte und Aktionen überzeugend präsentieren",
        "Deine Einsatzfläche pflegen und im Blick behalten",
        "Kurze tägliche Rückmeldung über unsere digitale Einsatzplanung",
      ],
      requirements: [
        "Zuverlässigkeit und ein freundliches Auftreten",
        "Freude an Kommunikation – Erfahrung ist keine Pflicht",
        "Deutsch sicher in Wort und Schrift",
      ],
      benefits: [
        "Gründliche Einarbeitung in Theorie und Praxis",
        "Regionaler Teamleiter als direkter Ansprechpartner",
        "Langfristiger Einsatz statt Eintagsaktion",
        "Innendienst Mo–Fr 08:00–17:00 Uhr erreichbar",
      ],
      driversLicense: "VON_VORTEIL" as const,
      contactName: "Jana Talackova",
    },
    {
      slug: "promotor-elektrofachmarkt-hessen",
      title: "Promotor (m/w/d) Elektrofachmarkt",
      bundesland: "HESSEN" as const,
      city: "Rhein-Main-Gebiet",
      einsatzbereich: "ELEKTROFACHMARKT" as const,
      employmentType: "VOLLZEIT" as const,
      intro:
        "Beratung und Verkauf auf Telekommunikationsflächen im Elektrofachmarkt: Du hilfst Kundinnen und Kunden, den passenden Tarif zu finden – geschult, begleitet und mit echter Perspektive.",
      tasks: [
        "Kunden auf der Fläche aktiv ansprechen und beraten",
        "Tarife und Produkte verständlich erklären",
        "Verträge über unsere digitalen Tools erfassen",
        "Zusammenarbeit mit dem Marktpersonal vor Ort",
      ],
      requirements: [
        "Kommunikationsfreude und verbindliches Auftreten",
        "Interesse an Technik und Tarifen (Einarbeitung übernehmen wir)",
        "Zuverlässigkeit und Flexibilität",
      ],
      benefits: [
        "Schulung durch erfahrene Trainer in eigenen Räumen",
        "Attraktive, leistungsbezogene Verdienstmöglichkeiten",
        "Besondere Leistungen können sich lohnen – bis hin zu Incentive-Reisen",
        "Langjährige Auftraggeber, planbare Einsätze",
      ],
      driversLicense: "VON_VORTEIL" as const,
      contactName: "Jasmin Mück",
    },
    {
      slug: "promotor-messen-events-bayern",
      title: "Promotor (m/w/d) Messen & Events",
      bundesland: "BAYERN" as const,
      city: "Großraum München / Nürnberg",
      einsatzbereich: "MESSEN_EVENTS" as const,
      employmentType: "TEILZEIT" as const,
      intro:
        "Abwechslung statt Alltag: Auf Messen und Events bringst Du Marken ins Gespräch – im Team, mit klarer Organisation im Rücken und Einsätzen, die zu Deinem Leben passen.",
      tasks: [
        "Besucherinnen und Besucher am Stand ansprechen",
        "Produkte vorführen und Interesse wecken",
        "Leads und Kontakte sauber erfassen",
        "Auf- und Abbau gemeinsam im Team",
      ],
      requirements: [
        "Offenes, gepflegtes Auftreten",
        "Spaß am Umgang mit vielen Menschen",
        "Flexibilität bei Einsatzzeiten (auch Wochenenden möglich)",
      ],
      benefits: [
        "Einsätze, die zu Deinem Kalender passen",
        "Faire, transparente Abrechnung",
        "Ein eingespieltes Team und feste Ansprechpartner",
      ],
      driversLicense: "VON_VORTEIL" as const,
      ownCar: "VON_VORTEIL" as const,
      contactName: "Jana Talackova",
    },
    {
      slug: "pos-betreuung-rheinland-pfalz",
      title: "PoS-Betreuer (m/w/d) Telekommunikation",
      bundesland: "RHEINLAND_PFALZ" as const,
      city: "Raum Mainz / Bingen",
      einsatzbereich: "POS_BETREUUNG" as const,
      employmentType: "VOLLZEIT" as const,
      intro:
        "Du betreust feste Flächen in Deiner Region dauerhaft: Beratung, Verkauf und der kurze Draht zu Markt und Teamleitung – ein Einsatz mit Verantwortung und Routine, die trotzdem nie langweilig wird.",
      tasks: [
        "Feste PoS-Flächen regelmäßig betreuen",
        "Kundenberatung und Vertragsabschlüsse",
        "Warenpräsentation und Flächenpflege",
        "Tagesabschluss über unser Portal",
      ],
      requirements: [
        "Zuverlässigkeit und Eigenverantwortung",
        "Freundliches, verbindliches Auftreten",
        "Führerschein erforderlich (wechselnde Standorte in der Region)",
      ],
      benefits: [
        "Langfristige Projekte mit Planungssicherheit",
        "Kurze Wege: Innendienst sitzt in Gau-Algesheim",
        "Weiterbildung durch erfahrene Trainer",
      ],
      driversLicense: "ERFORDERLICH" as const,
      contactName: "Jasmin Mück",
    },
  ];

  for (const job of demoJobs) {
    await db.job.upsert({
      where: { slug: job.slug },
      update: {},
      create: {
        ...job,
        description: { text: "" },
        status: "VEROEFFENTLICHT",
        publishedAt: new Date(),
        cvUploadEnabled: false,
      },
    });
  }

  // ---------- Fiktive Demo-Bewerber (nur Entwicklung) ----------
  if (!isProd) {
    const demoCandidates = [
      { firstName: "Deniz", lastName: "Beispiel (Demo)", email: "deniz.demo@example.invalid", phone: "+49 170 0000001", city: "Köln", bundesland: "NRW" as const, jobSlug: "promotor-leh-nrw" },
      { firstName: "Sofia", lastName: "Muster (Demo)", email: "sofia.demo@example.invalid", phone: "+49 170 0000002", city: "Frankfurt am Main", bundesland: "HESSEN" as const, jobSlug: "promotor-elektrofachmarkt-hessen" },
      { firstName: "Jonas", lastName: "Probe (Demo)", email: "jonas.demo@example.invalid", phone: "+49 170 0000003", city: "Mainz", bundesland: "RHEINLAND_PFALZ" as const, jobSlug: "pos-betreuung-rheinland-pfalz" },
      { firstName: "Aylin", lastName: "Test (Demo)", email: "aylin.demo@example.invalid", phone: "+49 170 0000004", city: "München", bundesland: "BAYERN" as const, jobSlug: "promotor-messen-events-bayern" },
    ];
    const mapping: Record<string, string> = { NRW: "NRW", HESSEN: "HESSEN", RHEINLAND_PFALZ: "HESSEN", BAYERN: "BAYERN" };
    for (const c of demoCandidates) {
      const exists = await db.candidate.findFirst({ where: { emailNormalized: c.email } });
      if (exists) continue;
      const job = await db.job.findUnique({ where: { slug: c.jobSlug } });
      const candidate = await db.candidate.create({
        data: {
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          emailNormalized: c.email,
          phone: c.phone,
          phoneNormalized: c.phone.replace(/\s/g, ""),
          city: c.city,
          bundesland: c.bundesland,
        },
      });
      const application = await db.application.create({
        data: {
          candidateId: candidate.id,
          jobId: job?.id,
          type: "STELLE",
          bundesland: c.bundesland,
          city: c.city,
          driversLicense: true,
          previousActivity: "Einzelhandel (Demo-Datensatz)",
          availableFrom: "sofort",
          responsibleRegionId: regions[mapping[c.bundesland] as string] as string,
          consentVersion: "demo",
        },
      });
      await db.applicationStatusHistory.create({
        data: { applicationId: application.id, toAuto: "NEU", comment: "Demo-Seed" },
      });
    }
  }

  if (printedCredentials.length) {
    console.log("\n──────────────────────────────────────────────");
    console.log("Seed: neu angelegte Zugänge (einmalige Ausgabe!)");
    for (const line of printedCredentials) console.log("  " + line);
    console.log("Alle Benutzer müssen das Passwort beim ersten Login ändern.");
    console.log("──────────────────────────────────────────────\n");
  }
  console.log("Seed abgeschlossen.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

/**
 * CMS-Inhaltsmodell: Jede öffentliche Seite besteht aus benannten Sektionen mit
 * typisierten Feldern. Der Adminbereich rendert daraus automatisch Formulare –
 * kein HTML nötig. Der "richtext"-Typ nutzt eine bewusst kleine, sichere
 * Auszeichnung (Absätze, ## Zwischenüberschrift, **fett**, *kursiv*, - Liste,
 * > Zitat, [Text](URL)) und wird serverseitig zu React gerendert (kein Roh-HTML).
 */

export type CmsFieldType = "text" | "textarea" | "richtext" | "image" | "list" | "pairs";

export type CmsFieldDef = {
  type: CmsFieldType;
  label: string;
  help?: string;
};

export type CmsSectionDef = {
  title: string;
  fields: Record<string, CmsFieldDef>;
};

export type CmsPageDef = {
  slug: string;
  title: string;
  /** Nur Administrator (Marketinginhalte) oder auch Innendienst? */
  marketing: boolean;
  sections: Record<string, CmsSectionDef>;
};

export type CmsImageValue = { src: string; alt: string; mediaId?: string };
export type CmsPairValue = { a: string; b: string };
export type CmsFieldValue = string | string[] | CmsImageValue | CmsPairValue[];
export type CmsPageContent = Record<string, Record<string, CmsFieldValue>>;

// ---------------------------------------------------------------
// Hilfen
// ---------------------------------------------------------------

const t = (label: string, help?: string): CmsFieldDef => ({ type: "text", label, help });
const ta = (label: string, help?: string): CmsFieldDef => ({ type: "textarea", label, help });
const rt = (label: string, help?: string): CmsFieldDef => ({ type: "richtext", label, help });
const img = (label: string, help?: string): CmsFieldDef => ({ type: "image", label, help });
const list = (label: string, help?: string): CmsFieldDef => ({ type: "list", label, help });
const pairs = (label: string, help?: string): CmsFieldDef => ({ type: "pairs", label, help });

// ---------------------------------------------------------------
// Seitendefinitionen
// ---------------------------------------------------------------

export const CMS_PAGES: Record<string, CmsPageDef> = {
  home: {
    slug: "home",
    title: "Startseite",
    marketing: true,
    sections: {
      hero: {
        title: "Hero",
        fields: {
          headline: t("Headline"),
          subline: ta("Subline"),
          ctaPrimary: t("Button 1 – Text"),
          ctaPrimaryHref: t("Button 1 – Ziel", "z. B. /jobs"),
          ctaSecondary: t("Button 2 – Text"),
          ctaSecondaryHref: t("Button 2 – Ziel"),
          image: img("Hero-Bild"),
          imageCaption: t("Bildunterschrift", "kleine Zeile unter dem Bild"),
        },
      },
      facts: {
        title: "Vertrauensfakten",
        fields: {
          items: pairs("Fakten", "links Wert (z. B. „15+“), rechts Beschreibung"),
        },
      },
      jobfinder: {
        title: "Jobfinder",
        fields: {
          eyebrow: t("Dachzeile"),
          title: t("Titel"),
          intro: ta("Einleitung"),
        },
      },
      services: {
        title: "Leistungen – Einstieg",
        fields: {
          eyebrow: t("Dachzeile"),
          title: t("Titel"),
          intro: ta("Einleitung"),
        },
      },
      serviceBlock1: {
        title: "Leistungsblock 1",
        fields: {
          title: t("Titel"),
          text: ta("Text"),
          bullets: list("Punkte"),
          image: img("Bild"),
        },
      },
      serviceBlock2: {
        title: "Leistungsblock 2",
        fields: {
          title: t("Titel"),
          text: ta("Text"),
          bullets: list("Punkte"),
          image: img("Bild"),
        },
      },
      serviceBlock3: {
        title: "Leistungsblock 3",
        fields: {
          title: t("Titel"),
          text: ta("Text"),
          bullets: list("Punkte"),
        },
      },
      work: {
        title: "Arbeiten bei Möller",
        fields: {
          eyebrow: t("Dachzeile"),
          title: t("Titel"),
          text: ta("Text"),
          benefits: list("Vorteile", "eine Zeile pro Vorteil"),
          image: img("Bild"),
        },
      },
      ceo: {
        title: "Geschäftsführer-Statement",
        fields: {
          name: t("Name"),
          role: t("Funktion"),
          statement: ta("Statement"),
          image: img("Foto", "professionelles, natürliches Foto"),
        },
      },
      jobsTeaser: {
        title: "Aktuelle Jobs",
        fields: {
          eyebrow: t("Dachzeile"),
          title: t("Titel"),
        },
      },
      gallery: {
        title: "Bildstrecke",
        fields: {
          eyebrow: t("Dachzeile"),
          title: t("Titel"),
          images: list("Bilder", "eine Zeile pro Bild: Pfad :: Alt-Text"),
        },
      },
    },
  },

  "ueber-uns": {
    slug: "ueber-uns",
    title: "Über uns",
    marketing: true,
    sections: {
      hero: {
        title: "Einstieg",
        fields: {
          eyebrow: t("Dachzeile"),
          headline: t("Headline"),
          intro: ta("Einleitung"),
          image: img("Bild"),
        },
      },
      story: {
        title: "Unsere Geschichte",
        fields: {
          title: t("Titel"),
          body: rt("Text"),
        },
      },
      values: {
        title: "Wofür wir stehen",
        fields: {
          title: t("Titel"),
          items: pairs("Werte", "links Begriff, rechts ein Satz dazu"),
        },
      },
      regions: {
        title: "Einsatzregionen",
        fields: {
          title: t("Titel"),
          text: ta("Text"),
        },
      },
      ceo: {
        title: "Geschäftsführung",
        fields: {
          name: t("Name"),
          role: t("Funktion"),
          statement: ta("Statement"),
          image: img("Foto"),
        },
      },
      team: {
        title: "Innendienst-Team (optional aktivierbar)",
        fields: {
          eyebrow: t("Dachzeile"),
          title: t("Titel"),
          intro: ta("Einleitung"),
        },
      },
    },
  },

  "fuer-unternehmen": {
    slug: "fuer-unternehmen",
    title: "Für Unternehmen",
    marketing: true,
    sections: {
      hero: {
        title: "Einstieg",
        fields: {
          eyebrow: t("Dachzeile"),
          headline: t("Headline"),
          intro: ta("Einleitung"),
          image: img("Bild"),
        },
      },
      promise: {
        title: "Kernversprechen",
        fields: {
          title: t("Titel"),
          body: rt("Text"),
        },
      },
      leistungen: {
        title: "Leistungen (Liste)",
        fields: {
          title: t("Titel"),
          intro: ta("Einleitung"),
          items: pairs("Leistungen", "links Titel, rechts Beschreibung"),
        },
      },
      steuerung: {
        title: "Block Steuerung & Qualität",
        fields: {
          title: t("Titel"),
          text: ta("Text"),
          bullets: list("Punkte"),
          image: img("Bild"),
        },
      },
      kontakt: {
        title: "Kontakt-Abschluss",
        fields: {
          title: t("Titel"),
          text: ta("Text"),
        },
      },
    },
  },

  "arbeiten-bei-moeller": {
    slug: "arbeiten-bei-moeller",
    title: "Arbeiten bei Möller",
    marketing: true,
    sections: {
      hero: {
        title: "Einstieg",
        fields: {
          eyebrow: t("Dachzeile"),
          headline: t("Headline"),
          intro: ta("Einleitung"),
          image: img("Bild"),
        },
      },
      benefits: {
        title: "Warum Möller",
        fields: {
          title: t("Titel"),
          items: pairs("Vorteile", "links Titel, rechts ein bis zwei Sätze"),
        },
      },
      quereinstieg: {
        title: "Quereinsteiger",
        fields: {
          title: t("Titel"),
          body: rt("Text"),
        },
      },
      eigenschaften: {
        title: "Was Du mitbringst",
        fields: {
          title: t("Titel"),
          items: list("Eigenschaften"),
          note: ta("Hinweis", "z. B. zum Führerschein"),
        },
      },
      einarbeitung: {
        title: "Einarbeitung & Schulung",
        fields: {
          title: t("Titel"),
          text: ta("Text"),
          image: img("Bild"),
        },
      },
      cta: {
        title: "Abschluss-CTA",
        fields: {
          title: t("Titel"),
          text: ta("Text"),
        },
      },
    },
  },

  kontakt: {
    slug: "kontakt",
    title: "Kontakt",
    marketing: true,
    sections: {
      hero: {
        title: "Einstieg",
        fields: {
          headline: t("Headline"),
          intro: ta("Einleitung"),
        },
      },
    },
  },

  impressum: {
    slug: "impressum",
    title: "Impressum",
    marketing: true,
    sections: {
      inhalt: {
        title: "Impressum (Rechtstext)",
        fields: {
          body: rt(
            "Inhalt",
            "Rechtsinhalt – bitte durch juristisch geprüften Text ersetzen. Platzhalter sind markiert.",
          ),
        },
      },
    },
  },

  datenschutz: {
    slug: "datenschutz",
    title: "Datenschutz",
    marketing: true,
    sections: {
      inhalt: {
        title: "Datenschutzerklärung (Rechtstext)",
        fields: {
          body: rt(
            "Inhalt",
            "Rechtsinhalt – bitte durch juristisch geprüften Text ersetzen. Platzhalter sind markiert.",
          ),
        },
      },
    },
  },

  empfehlen: {
    slug: "empfehlen",
    title: "Mitarbeiter empfehlen",
    marketing: true,
    sections: {
      hero: {
        title: "Einstieg",
        fields: {
          eyebrow: t("Dachzeile"),
          headline: t("Headline"),
          intro: ta("Einleitung"),
        },
      },
    },
  },

  jobs: {
    slug: "jobs",
    title: "Jobs (Übersicht)",
    marketing: true,
    sections: {
      hero: {
        title: "Einstieg",
        fields: {
          headline: t("Headline"),
          intro: ta("Einleitung"),
        },
      },
      empty: {
        title: "Leerer Zustand",
        fields: {
          title: t("Titel"),
          text: ta("Text"),
        },
      },
    },
  },

  initiativbewerbung: {
    slug: "initiativbewerbung",
    title: "Initiativbewerbung",
    marketing: true,
    sections: {
      hero: {
        title: "Einstieg",
        fields: {
          headline: t("Headline"),
          intro: ta("Einleitung"),
        },
      },
    },
  },
};

export type CmsPageSlug = keyof typeof CMS_PAGES;

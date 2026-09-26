import type { Metadata } from "next";
import { requirePermission } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/ui";
import { JobForm } from "@/components/admin/job-form";

export const metadata: Metadata = { title: "Neue Stelle" };

export default async function NeueStellePage() {
  await requirePermission("jobs.manage");
  return (
    <>
      <PageHeader title="Neue Stelle" description="Nach dem Speichern liegt die Stelle als Entwurf vor." />
      <JobForm
        job={{
          title: "",
          slug: "",
          bundesland: "NRW",
          city: "",
          plz: "",
          einsatzbereich: "LEH",
          employmentType: "VOLLZEIT",
          startDate: "",
          endDate: "",
          intro: "",
          descriptionText: "",
          tasks: "",
          requirements: "",
          benefits: "",
          contactName: "",
          contactPhone: "",
          publishAt: "",
          expiresAt: "",
          autoDeactivate: true,
          driversLicense: "VON_VORTEIL",
          ownCar: "NICHT_NOTWENDIG",
          cvUploadEnabled: false,
          indexable: true,
        }}
      />
    </>
  );
}

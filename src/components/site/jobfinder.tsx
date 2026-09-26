"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const REGIONS = [
  { value: "NRW", label: "NRW" },
  { value: "HESSEN", label: "Hessen" },
  { value: "RHEINLAND_PFALZ", label: "Rheinland-Pfalz" },
  { value: "BAYERN", label: "Bayern" },
] as const;

/** Jobfinder der Startseite: Region + PLZ/Ort → /jobs mit Filtern. */
export function Jobfinder() {
  const router = useRouter();
  const [region, setRegion] = useState<string>("");
  const [ort, setOrt] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (region) params.set("bundesland", region);
    if (ort.trim()) params.set("ort", ort.trim());
    router.push(`/jobs${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <form onSubmit={submit} aria-label="Jobs nach Region suchen">
      <fieldset>
        <legend className="sr-only">Region auswählen</legend>
        <div className="flex flex-wrap gap-2.5" role="group">
          {REGIONS.map((r) => {
            const active = region === r.value;
            return (
              <button
                key={r.value}
                type="button"
                aria-pressed={active}
                onClick={() => setRegion(active ? "" : r.value)}
                className={cn(
                  "rounded-[2px] border-[1.5px] px-4 py-2.5 text-[0.95rem] font-semibold transition-colors duration-150",
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-white text-ink hover:border-brand hover:text-brand",
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">PLZ oder Ort</span>
          <input
            type="text"
            value={ort}
            onChange={(e) => setOrt(e.target.value)}
            placeholder="PLZ oder Ort (optional)"
            autoComplete="postal-code"
            className="w-full rounded-[2px] border-[1.5px] border-line bg-white px-4 py-2.5 text-ink placeholder:text-ink-mute focus:border-brand focus:outline-none"
          />
        </label>
        <Button type="submit" size="md" className="sm:px-8">
          Jobs anzeigen
        </Button>
      </div>
    </form>
  );
}

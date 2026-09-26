"use client";

import { useState } from "react";

/** Teilen: WhatsApp, Link kopieren, E-Mail (Masterprompt §14). */
export function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Link kopieren:", url);
    }
  }

  const waText = encodeURIComponent(`Schau mal, das könnte was für Dich sein: ${title} bei Möller – ${url}`);
  const mail = `mailto:?subject=${encodeURIComponent(`Job bei Möller: ${title}`)}&body=${waText}`;

  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="text-sm font-semibold text-ink">Stelle teilen</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a href={`https://wa.me/?text=${waText}`} rel="noopener" target="_blank" className="prose-link">
          WhatsApp
        </a>
        <button type="button" onClick={copy} className="prose-link cursor-pointer" aria-live="polite">
          {copied ? "Link kopiert ✓" : "Link kopieren"}
        </button>
        <a href={mail} className="prose-link">
          E-Mail
        </a>
      </div>
    </div>
  );
}

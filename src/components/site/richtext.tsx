import { Fragment } from "react";

/**
 * Sicherer Mini-Renderer für den CMS-"richtext"-Typ.
 * Unterstützt: Absätze (Leerzeile), "## " Zwischenüberschrift, "- " Listen,
 * "> " Zitate, **fett**, *kursiv*, [Text](URL). Kein HTML-Passthrough.
 */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Reihenfolge: Links → fett → kursiv
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] && match[2]) {
      const href = match[2];
      const safe = href.startsWith("/") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:");
      nodes.push(
        safe ? (
          <a key={`${keyPrefix}-l${i}`} href={href} className="prose-link">
            {match[1]}
          </a>
        ) : (
          match[1]
        ),
      );
    } else if (match[3]) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{match[3]}</strong>);
    } else if (match[4]) {
      nodes.push(<em key={`${keyPrefix}-i${i}`}>{match[4]}</em>);
    }
    last = match.index + match[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={bi} className="mt-10 mb-3 text-2xl first:mt-0">
              {renderInline(block.slice(3), `h-${bi}`)}
            </h2>
          );
        }
        if (block.startsWith("> ")) {
          return (
            <blockquote key={bi} className="my-5 border-l-2 border-brand pl-4 text-ink-mute">
              {renderInline(block.replace(/^> ?/gm, ""), `q-${bi}`)}
            </blockquote>
          );
        }
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={bi} className="my-4 list-disc space-y-1.5 pl-5">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.slice(2), `li-${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi} className="my-4 first:mt-0 last:mb-0">
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(l, `p-${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

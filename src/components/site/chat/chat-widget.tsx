"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Msg = { id: string; sender: "BESUCHER" | "TEAM" | "SYSTEM"; body: string; createdAt: string };

/**
 * Live-Chat-Widget: unaufdringlich (kleiner Button unten rechts), mobil als
 * Vollbild-Sheet, barrierearm (Dialog-Semantik, Fokus, Tastatur).
 * Kein Bot – echte Antworten vom Innendienst.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [contact, setContact] = useState({ name: "", email: "" });
  const [started, setStarted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        open: boolean;
        conversation: { messages: Msg[] } | null;
      };
      setBusinessOpen(data.open);
      if (data.conversation) {
        setMessages(data.conversation.messages);
        setStarted(true);
      }
    } catch {
      /* Netzwerkfehler: still bleiben, Polling versucht es erneut */
    }
  }, []);

  // Beim Öffnen laden + SSE verbinden (mit Polling-Fallback)
  useEffect(() => {
    if (!open) return;
    void load();
    const poll = setInterval(() => {
      if (!esRef.current) void load();
    }, 15000);
    return () => clearInterval(poll);
  }, [open, load]);

  useEffect(() => {
    if (!open || !started) return;
    const es = new EventSource("/api/chat/stream");
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as { type: string; payload: Msg };
        if (event.type === "message") {
          setMessages((prev) =>
            prev.some((m) => m.id === event.payload.id) ? prev : [...prev, event.payload],
          );
        }
      } catch {
        /* ignorieren */
      }
    };
    es.onerror = () => {
      es.close();
      esRef.current = null;
    };
    return () => {
      es.close();
      esRef.current = null;
    };
  }, [open, started]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  // ESC schließt
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          name: contact.name || undefined,
          email: contact.email || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Das hat leider nicht geklappt. Bitte versuch es erneut.");
        return;
      }
      setInput("");
      setStarted(true);
      void load();
    } catch {
      setError("Keine Verbindung. Bitte prüf Dein Internet und versuch es erneut.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Auslöser */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-[2px] bg-ink px-4 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-brand",
          open && "hidden",
        )}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className={cn("absolute inline-flex h-full w-full rounded-full", businessOpen === false ? "bg-white/40" : "bg-positive")} />
        </span>
        Chat
      </button>

      {/* Panel */}
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Live-Chat mit dem Möller-Innendienst"
          aria-modal="false"
          className="fixed inset-0 z-50 flex flex-col bg-white shadow-2xl md:inset-auto md:bottom-5 md:right-5 md:h-[34rem] md:w-[24rem] md:border md:border-line"
        >
          <header className="flex items-center justify-between gap-3 border-b border-line bg-ink px-4 py-3.5 text-white">
            <div>
              <p className="font-display font-bold">Chat mit Möller</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">
                <span className={cn("inline-block h-2 w-2 rounded-full", businessOpen === false ? "bg-white/40" : "bg-positive")} />
                {businessOpen === false
                  ? "Gerade nicht besetzt – wir antworten am nächsten Werktag"
                  : "Wir sind erreichbar"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 items-center justify-center text-white/80 hover:text-white"
            >
              <span className="sr-only">Chat schließen</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-paper-warm p-4" aria-live="polite">
            {messages.length === 0 ? (
              <div className="rounded-[2px] bg-white p-3.5 text-[0.95rem] text-ink-soft shadow-sm">
                {businessOpen === false ? (
                  <>Hallo! Gerade sind wir nicht am Platz (Mo–Fr erreichbar). Schreib uns trotzdem – wir melden uns am nächsten Werktag. Wenn Du magst, lass Name und E-Mail da.</>
                ) : (
                  <>Hallo! Hier schreibst Du direkt mit unserem Innendienst – keine Bots, versprochen. Wie können wir helfen?</>
                )}
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-[2px] p-3 text-[0.95rem] shadow-sm",
                    m.sender === "BESUCHER" ? "ml-auto bg-brand text-white" : "bg-white text-ink-soft",
                  )}
                >
                  {m.body}
                </div>
              ))
            )}
          </div>

          <form onSubmit={send} className="border-t border-line bg-white p-3">
            {!started ? (
              <div className="mb-2 grid grid-cols-2 gap-2">
                <label>
                  <span className="sr-only">Dein Name (optional)</span>
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                    placeholder="Name (optional)"
                    autoComplete="name"
                    className="w-full rounded-[2px] border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                </label>
                <label>
                  <span className="sr-only">Deine E-Mail (optional)</span>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                    placeholder="E-Mail (optional)"
                    autoComplete="email"
                    className="w-full rounded-[2px] border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                </label>
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="mb-2 text-sm text-danger">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="sr-only">Deine Nachricht</span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Deine Nachricht …"
                  maxLength={2000}
                  className="w-full rounded-[2px] border border-line px-3 py-2.5 focus:border-brand focus:outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="rounded-[2px] bg-brand px-4 font-semibold text-white transition-colors hover:bg-brand-deep disabled:opacity-50"
              >
                <span className="sr-only md:not-sr-only">Senden</span>
                <svg viewBox="0 0 20 20" className="h-5 w-5 md:hidden" fill="currentColor" aria-hidden="true">
                  <path d="M2 10 18 2l-4 8 4 8-16-8Z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { chatReplyAction } from "@/app/actions/admin-chat";
import type { ActionResult } from "@/app/actions/admin-candidates";
import { cn } from "@/lib/utils";

type Msg = { id: string; sender: string; body: string; createdAt: string; senderName?: string | null };

/** Live-Ansicht einer Unterhaltung (SSE) + Antworten. */
export function ChatThread({ conversationId, initialMessages }: { conversationId: string; initialMessages: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(chatReplyAction, null);
  const listRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/admin/chat/stream?conversation=${conversationId}`);
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as { type: string; payload: Msg };
        if (event.type === "message") {
          setMessages((prev) => (prev.some((m) => m.id === event.payload.id) ? prev : [...prev, event.payload]));
        }
      } catch {
        /* ignorieren */
      }
    };
    return () => es.close();
  }, [conversationId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <section className="flex min-h-[28rem] flex-col border border-line bg-white" aria-label="Chatverlauf">
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-paper-warm p-4" aria-live="polite">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[80%] rounded-[2px] p-3 text-[0.95rem] shadow-sm",
              m.sender === "TEAM" ? "ml-auto bg-brand text-white" : "bg-white",
            )}
          >
            <p className="whitespace-pre-wrap">{m.body}</p>
            <p className={cn("mt-1 text-[0.7rem]", m.sender === "TEAM" ? "text-white/70" : "text-ink-mute")}>
              {m.sender === "TEAM" ? (m.senderName ?? "Team") : m.sender === "SYSTEM" ? "System" : "Besucher"} ·{" "}
              {new Date(m.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
            </p>
          </div>
        ))}
      </div>
      <form ref={formRef} action={formAction} className="flex gap-2 border-t border-line p-3">
        <input type="hidden" name="conversationId" value={conversationId} />
        <label className="flex-1">
          <span className="sr-only">Antwort</span>
          <input name="body" required maxLength={2000} placeholder="Deine Antwort …" className="w-full rounded-[2px] border-[1.5px] border-line px-3 py-2.5 focus:border-brand focus:outline-none" />
        </label>
        <button type="submit" disabled={pending} className="rounded-[2px] bg-brand px-5 font-semibold text-white hover:bg-brand-deep disabled:opacity-50">
          Senden
        </button>
      </form>
      {state?.error ? (
        <p role="alert" className="border-t border-danger bg-danger-wash px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </section>
  );
}

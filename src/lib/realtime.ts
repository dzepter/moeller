/**
 * Realtime-Abstraktion für den Live-Chat (SSE).
 * Default: In-Memory-Hub (ein Prozess). Für Multi-Instanz-Betrieb kann ein
 * Redis-Pub/Sub-Hub dieses Interface implementieren – Aufrufer bleiben gleich.
 * Die Datenbank bleibt Quelle der Wahrheit; SSE beschleunigt nur die Zustellung.
 */

export type RealtimeEvent = {
  type: string;
  payload: unknown;
};

type Listener = (event: RealtimeEvent) => void;

export interface RealtimeHub {
  publish(channel: string, event: RealtimeEvent): void;
  subscribe(channel: string, listener: Listener): () => void;
}

class InMemoryHub implements RealtimeHub {
  private channels = new Map<string, Set<Listener>>();

  publish(channel: string, event: RealtimeEvent): void {
    this.channels.get(channel)?.forEach((l) => {
      try {
        l(event);
      } catch {
        // Listener-Fehler dürfen andere Zusteller nicht stören
      }
    });
  }

  subscribe(channel: string, listener: Listener): () => void {
    let set = this.channels.get(channel);
    if (!set) {
      set = new Set();
      this.channels.set(channel, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.channels.delete(channel);
    };
  }
}

// Immer über globalThis verankern – auch in Produktion: Next.js bündelt
// Server Actions und Route Handler getrennt, jede Bundle-Einheit bekäme sonst
// ihre eigene Hub-Instanz und SSE-Abonnenten würden Publishes nie sehen.
const globalForHub = globalThis as unknown as { realtimeHub?: RealtimeHub };
export const realtimeHub: RealtimeHub = (globalForHub.realtimeHub ??= new InMemoryHub());

/** SSE-Response für einen Kanal bauen (Route Handler). */
export function sseResponse(channel: string, opts?: { heartbeatMs?: number; signal?: AbortSignal }): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: RealtimeEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const unsubscribe = realtimeHub.subscribe(channel, send);
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          /* geschlossen */
        }
      }, opts?.heartbeatMs ?? 25_000);
      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* bereits geschlossen */
        }
      };
      opts?.signal?.addEventListener("abort", close);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

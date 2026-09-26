import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { env } from "@/lib/env";
import { generateToken } from "@/lib/crypto";

/**
 * Dateispeicher-Abstraktion: lokal (Default) oder S3-kompatibel.
 * Zwei getrennte Wurzeln: "public" (CMS-Medien) und "private" (Bewerberdateien,
 * Academy-Assets) – private Dateien werden NIE direkt ausgeliefert, sondern nur
 * über autorisierte Streaming-Routen.
 */

export type StorageScope = "public" | "private";

export interface StorageProvider {
  put(scope: StorageScope, fileName: string, data: Buffer, mime: string): Promise<void>;
  get(scope: StorageScope, fileName: string): Promise<Buffer>;
  delete(scope: StorageScope, fileName: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  private root(scope: StorageScope): string {
    return path.resolve(env.storage.localRoot, scope);
  }
  private resolveSafe(scope: StorageScope, fileName: string): string {
    const root = this.root(scope);
    const full = path.resolve(root, fileName);
    if (!full.startsWith(root + path.sep)) throw new Error("Ungültiger Dateiname");
    return full;
  }
  async put(scope: StorageScope, fileName: string, data: Buffer): Promise<void> {
    const full = this.resolveSafe(scope, fileName);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }
  async get(scope: StorageScope, fileName: string): Promise<Buffer> {
    return readFile(this.resolveSafe(scope, fileName));
  }
  async delete(scope: StorageScope, fileName: string): Promise<void> {
    await unlink(this.resolveSafe(scope, fileName)).catch(() => undefined);
  }
}

/**
 * S3-kompatibler Provider (AWS SDK wird nur bei Bedarf geladen, damit die
 * Abhängigkeit optional bleibt). Konfiguration siehe .env.example.
 */
class S3StorageProvider implements StorageProvider {
  private bucket(scope: StorageScope): string {
    return scope === "public" ? env.storage.s3.bucketPublic : env.storage.s3.bucketPrivate;
  }
  private async client() {
    // Optionaler Import: Paketname als Variable, damit die Abhängigkeit
    // nur bei STORAGE_PROVIDER=s3 benötigt wird.
    const moduleName = "@aws-sdk/client-s3";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(/* webpackIgnore: true */ moduleName).catch(() => {
      throw new Error("STORAGE_PROVIDER=s3 benötigt das Paket @aws-sdk/client-s3 (npm install @aws-sdk/client-s3)");
    });
    const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = mod;
    const s3 = env.storage.s3;
    return {
      client: new S3Client({
        region: s3.region || "auto",
        endpoint: s3.endpoint || undefined,
        credentials: { accessKeyId: s3.accessKeyId, secretAccessKey: s3.secretAccessKey },
      }),
      GetObjectCommand,
      PutObjectCommand,
      DeleteObjectCommand,
    };
  }
  async put(scope: StorageScope, fileName: string, data: Buffer, mime: string): Promise<void> {
    const { client, PutObjectCommand } = await this.client();
    await client.send(new PutObjectCommand({ Bucket: this.bucket(scope), Key: fileName, Body: data, ContentType: mime }));
  }
  async get(scope: StorageScope, fileName: string): Promise<Buffer> {
    const { client, GetObjectCommand } = await this.client();
    const res = await client.send(new GetObjectCommand({ Bucket: this.bucket(scope), Key: fileName }));
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error("Datei nicht gefunden");
    return Buffer.from(bytes);
  }
  async delete(scope: StorageScope, fileName: string): Promise<void> {
    const { client, DeleteObjectCommand } = await this.client();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket(scope), Key: fileName }));
  }
}

export const storage: StorageProvider =
  env.storage.provider === "s3" ? new S3StorageProvider() : new LocalStorageProvider();

// ---------- Upload-Validierung ----------

const MAGIC_BYTES: Array<{ mime: string; ext: string[]; magic: (b: Buffer) => boolean }> = [
  { mime: "application/pdf", ext: ["pdf"], magic: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  { mime: "image/jpeg", ext: ["jpg", "jpeg"], magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  { mime: "image/png", ext: ["png"], magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", ext: ["webp"], magic: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function validateUpload(originalName: string, data: Buffer, allowed: Array<"pdf" | "image">): string | null {
  if (data.length === 0) return "Die Datei ist leer.";
  if (data.length > MAX_UPLOAD_BYTES) return "Die Datei ist größer als 10 MB.";
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "";
  const candidates = MAGIC_BYTES.filter((m) =>
    allowed.includes(m.mime === "application/pdf" ? "pdf" : "image"),
  );
  const match = candidates.find((m) => m.ext.includes(ext) && m.magic(data));
  if (!match) return "Erlaubt sind nur " + (allowed.includes("pdf") ? "PDF-, " : "") + "JPG-, PNG- und WebP-Dateien.";
  return null;
}

export function detectedMime(originalName: string, data: Buffer): string {
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "";
  return MAGIC_BYTES.find((m) => m.ext.includes(ext) && m.magic(data))?.mime ?? "application/octet-stream";
}

/** Randomisierter Speichername, gruppiert nach Jahr/Monat. */
export function randomFileName(originalName: string): string {
  const ext = (originalName.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const d = new Date();
  const dir = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${dir}/${generateToken().slice(0, 32)}.${ext}`;
}

/**
 * Malware-Scan-Adapter für Bewerber-Uploads.
 *
 * Provider (MALWARE_SCANNER):
 * - "none" (Default): KEIN Scan. Das ist ausdrücklich kein Schutz, sondern ein
 *   dokumentiertes Restrisiko – der Go-Live-Check warnt entsprechend.
 * - "clamav": Scan über einen laufenden clamd (CLAMAV_HOST/CLAMAV_PORT,
 *   INSTREAM-Protokoll, ohne Zusatzabhängigkeit). FAIL-CLOSED: Ist Scanning
 *   konfiguriert, aber der Scanner nicht erreichbar, gilt die Datei als NICHT
 *   geprüft und wird abgelehnt – es wird niemals stillschweigend so getan,
 *   als wäre gescannt worden.
 */
export interface MalwareScanner {
  scan(data: Buffer): Promise<{ clean: boolean; reason?: string }>;
}

class NoopScanner implements MalwareScanner {
  async scan(): Promise<{ clean: boolean }> {
    return { clean: true }; // bewusst ungeprüft – siehe Doku/Go-Live-Check
  }
}

class ClamAvScanner implements MalwareScanner {
  async scan(data: Buffer): Promise<{ clean: boolean; reason?: string }> {
    const { host, port, timeoutMs } = env.malwareScanner.clamav;
    try {
      const response = await clamdInstream(host, port, timeoutMs, data);
      if (/\bOK$/.test(response)) return { clean: true };
      const found = response.match(/:\s*(.+)\s+FOUND$/);
      return { clean: false, reason: found?.[1] ?? response };
    } catch (err) {
      console.error("[malware-scan] clamd nicht erreichbar – Upload wird abgelehnt (fail closed):", err instanceof Error ? err.message : err);
      return { clean: false, reason: "Scanner nicht erreichbar" };
    }
  }
}

/** clamd INSTREAM: zINSTREAM\0, dann Chunks (4-Byte-BE-Länge + Daten), Ende = Länge 0. */
async function clamdInstream(host: string, port: number, timeoutMs: number, data: Buffer): Promise<string> {
  const { createConnection } = await import("node:net");
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    const chunks: Buffer[] = [];
    const fail = (err: Error) => {
      socket.destroy();
      reject(err);
    };
    socket.setTimeout(timeoutMs, () => fail(new Error("clamd-Timeout")));
    socket.on("error", fail);
    socket.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    socket.on("close", () => {
      const response = Buffer.concat(chunks).toString("utf8").replace(/\0.*$/s, "").trim();
      if (!response) reject(new Error("Leere clamd-Antwort"));
      else resolve(response);
    });
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      const CHUNK = 64 * 1024;
      for (let offset = 0; offset < data.length; offset += CHUNK) {
        const part = data.subarray(offset, offset + CHUNK);
        const len = Buffer.alloc(4);
        len.writeUInt32BE(part.length, 0);
        socket.write(len);
        socket.write(part);
      }
      socket.write(Buffer.alloc(4)); // Länge 0 = Ende
    });
  });
}

export function createMalwareScanner(provider: "none" | "clamav"): MalwareScanner {
  return provider === "clamav" ? new ClamAvScanner() : new NoopScanner();
}

export const malwareScanner: MalwareScanner = createMalwareScanner(env.malwareScanner.provider);

export function etagFor(data: Buffer): string {
  return `"${createHash("sha1").update(data).digest("hex")}"`;
}

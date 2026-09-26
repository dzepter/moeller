import { PrismaClient } from "@prisma/client";

// Immer über globalThis verankern – auch in Produktion: getrennte Bundle-
// Einheiten (Server Actions / Route Handler) teilen sich so einen Client
// statt mehrere Connection-Pools zu öffnen.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = (globalForPrisma.prisma ??= new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
}));

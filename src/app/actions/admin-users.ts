"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/rbac";
import { hashPassword, validatePasswordPolicy } from "@/lib/auth/password";
import { revokeAllSessions } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/app/actions/admin-candidates";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  roleId: z.string().min(1),
  regionId: z.string().optional(),
  password: z.string().min(1).max(200),
});

export async function createUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor, "users.manage")) return { error: "Keine Berechtigung." };
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Bitte alle Pflichtfelder korrekt ausfüllen." };
  const policyError = validatePasswordPolicy(parsed.data.password);
  if (policyError) return { error: policyError };

  const email = parsed.data.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) return { error: "Diese E-Mail-Adresse ist bereits vergeben." };

  const user = await db.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
      regionId: parsed.data.regionId || null,
      mustChangePassword: true,
      roles: { create: { roleId: parsed.data.roleId } },
    },
  });
  await audit({ action: "user.created", actorId: actor.id, entityType: "User", entityId: user.id, meta: { roleId: parsed.data.roleId } });
  revalidatePath("/admin/benutzer");
  return { ok: true };
}

const updateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  roleId: z.string().min(1),
  regionId: z.string().optional(),
  active: z.string().optional(),
});

export async function updateUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor, "users.manage")) return { error: "Keine Berechtigung." };
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Ungültige Eingaben." };
  const { userId, name, roleId, regionId } = parsed.data;
  const active = parsed.data.active === "on";

  if (userId === actor.id && !active) return { error: "Du kannst Dich nicht selbst deaktivieren." };

  const target = await db.user.findUnique({ where: { id: userId }, include: { roles: true } });
  if (!target) return { error: "Benutzer nicht gefunden." };

  // Letzten aktiven Administrator schützen
  const adminRole = await db.role.findUnique({ where: { key: "ADMINISTRATOR" } });
  if (adminRole) {
    const isAdmin = target.roles.some((r) => r.roleId === adminRole.id);
    const willBeAdmin = roleId === adminRole.id && active;
    if (isAdmin && !willBeAdmin) {
      const otherAdmins = await db.user.count({
        where: { active: true, id: { not: userId }, roles: { some: { roleId: adminRole.id } } },
      });
      if (otherAdmins === 0) return { error: "Der letzte aktive Administrator kann nicht entfernt werden." };
    }
  }

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { name, regionId: regionId || null, active } }),
    db.userRole.deleteMany({ where: { userId } }),
    db.userRole.create({ data: { userId, roleId } }),
  ]);
  if (!active) await revokeAllSessions(userId);
  await audit({
    action: active ? "user.updated" : "user.deactivated",
    actorId: actor.id,
    entityType: "User",
    entityId: userId,
    meta: { roleId, regionId: regionId || null, active },
  });
  revalidatePath("/admin/benutzer");
  return { ok: true };
}

export async function resetUserPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor, "users.manage")) return { error: "Keine Berechtigung." };
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  const policyError = validatePasswordPolicy(password);
  if (policyError) return { error: policyError };
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true },
  });
  await revokeAllSessions(userId);
  await audit({ action: "auth.password.changed", actorId: actor.id, entityType: "User", entityId: userId, meta: { byAdmin: true } });
  revalidatePath("/admin/benutzer");
  return { ok: true };
}

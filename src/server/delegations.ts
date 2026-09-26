import { db } from "@/lib/db";
import { hasPermission, ForbiddenError, type CurrentUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";

/**
 * Teamleiter-Vertretungen (Masterprompt §22).
 * Schutzregeln: keine Selbstvertretung, keine zeitgleiche Zirkularität,
 * keine transitive Rechtevererbung (systemisch: Scope zählt nur direkte Delegationen).
 */

export async function createDelegation(
  user: CurrentUser,
  params: { fromUserId: string; toUserId: string; startsAt: Date; endsAt: Date; reason?: string },
) {
  const canManage = hasPermission(user, "delegations.manage");
  const canSelf = hasPermission(user, "delegations.self");
  // Default-Policy: Teamleiter dürfen die eigene Vertretung anlegen
  if (!canManage && !(canSelf && params.fromUserId === user.id)) throw new ForbiddenError();

  if (params.fromUserId === params.toUserId) {
    throw new Error("Selbstvertretung ist nicht möglich.");
  }
  if (params.endsAt <= params.startsAt) {
    throw new Error("Das Ende muss nach dem Beginn liegen.");
  }

  const [fromUser, toUser] = await Promise.all([
    db.user.findUnique({ where: { id: params.fromUserId } }),
    db.user.findUnique({ where: { id: params.toUserId } }),
  ]);
  if (!fromUser?.active || !toUser?.active) throw new Error("Beide Benutzer müssen aktiv sein.");
  if (!fromUser.regionId) throw new Error("Die vertretene Person hat keine eigene Region.");

  // Zirkularität im selben Zeitraum: B vertritt A, während A B vertritt
  const circular = await db.teamLeadDelegation.findFirst({
    where: {
      fromUserId: params.toUserId,
      toUserId: params.fromUserId,
      cancelledAt: null,
      startsAt: { lt: params.endsAt },
      endsAt: { gt: params.startsAt },
    },
  });
  if (circular) {
    throw new Error("Zirkuläre Vertretung im selben Zeitraum ist nicht möglich.");
  }

  // Konflikt: dieselbe Vertretung überlappend doppelt
  const overlap = await db.teamLeadDelegation.findFirst({
    where: {
      fromUserId: params.fromUserId,
      toUserId: params.toUserId,
      cancelledAt: null,
      startsAt: { lt: params.endsAt },
      endsAt: { gt: params.startsAt },
    },
  });
  if (overlap) {
    throw new Error("Für diesen Zeitraum existiert bereits eine überlappende Vertretung.");
  }

  const delegation = await db.teamLeadDelegation.create({
    data: {
      fromUserId: params.fromUserId,
      toUserId: params.toUserId,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      reason: params.reason || null,
      createdById: user.id,
    },
  });
  await audit({
    action: "delegation.created",
    actorId: user.id,
    entityType: "TeamLeadDelegation",
    entityId: delegation.id,
    meta: { from: params.fromUserId, to: params.toUserId, startsAt: params.startsAt.toISOString(), endsAt: params.endsAt.toISOString() },
  });
  return delegation;
}

export async function cancelDelegation(user: CurrentUser, delegationId: string) {
  const delegation = await db.teamLeadDelegation.findUniqueOrThrow({ where: { id: delegationId } });
  const canManage = hasPermission(user, "delegations.manage");
  const isOwn = delegation.fromUserId === user.id && hasPermission(user, "delegations.self");
  if (!canManage && !isOwn) throw new ForbiddenError();

  await db.teamLeadDelegation.update({ where: { id: delegationId }, data: { cancelledAt: new Date() } });
  await audit({ action: "delegation.cancelled", actorId: user.id, entityType: "TeamLeadDelegation", entityId: delegationId });
}

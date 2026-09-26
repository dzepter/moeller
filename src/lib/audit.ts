import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "auth.login"
  | "auth.login.failed"
  | "auth.logout"
  | "auth.logout.all"
  | "auth.password.reset.requested"
  | "auth.password.reset.completed"
  | "auth.password.changed"
  | "auth.mfa.enabled"
  | "auth.mfa.disabled"
  | "user.created"
  | "user.updated"
  | "user.deactivated"
  | "role.changed"
  | "application.created"
  | "application.status.changed"
  | "application.assigned"
  | "application.exported"
  | "application.deleted"
  | "application.anonymized"
  | "candidate.merged"
  | "candidate.exported"
  | "candidate.anonymized"
  | "note.created"
  | "note.edited"
  | "reminder.created"
  | "reminder.completed"
  | "delegation.created"
  | "delegation.cancelled"
  | "referral.created"
  | "referral.status.changed"
  | "referral.converted"
  | "chat.started"
  | "chat.assigned"
  | "chat.status.changed"
  | "job.created"
  | "job.updated"
  | "job.published"
  | "job.archived"
  | "cms.saved"
  | "cms.published"
  | "cms.restored"
  | "media.uploaded"
  | "media.updated"
  | "media.deleted"
  | "settings.updated"
  | "reporting.exported"
  | "retention.executed"
  | "academy.assignment.created"
  | "academy.invitation.sent"
  | "academy.invitation.revoked"
  | "academy.completed"
  | "academy.version.published"
  | "system.scheduler.run";

export async function audit(params: {
  action: AuditAction;
  actorId?: string | null;
  actorType?: "USER" | "SYSTEM" | "VISITOR";
  entityType?: string;
  entityId?: string;
  meta?: Prisma.InputJsonValue;
  ipHash?: string;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      action: params.action,
      actorId: params.actorId ?? null,
      actorType: params.actorType ?? (params.actorId ? "USER" : "SYSTEM"),
      entityType: params.entityType,
      entityId: params.entityId,
      meta: params.meta ?? {},
      ipHash: params.ipHash,
    },
  });
}

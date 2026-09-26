import { vi, beforeEach } from "vitest";

/**
 * Test-Setup: Next.js-Request-APIs mocken (Tests laufen ohne HTTP-Kontext)
 * und die Test-Datenbank vor jedem Test leeren.
 */

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
    delete: () => undefined,
  }),
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => undefined,
  revalidateTag: () => undefined,
}));

import { db } from "@/lib/db";
import { clearSettingsCache } from "@/lib/settings";

const TABLES = [
  "TrainingReminderLog",
  "TrainingCompletion",
  "TrainingAnswer",
  "TrainingProgress",
  "TrainingInvitation",
  "TrainingAssignment",
  "TrainingQuestionOption",
  "TrainingQuestion",
  "TrainingLesson",
  "TrainingModule",
  "TrainingAsset",
  "TrainingCourseVersion",
  "TrainingCourse",
  "AnalyticsEvent",
  "AuditLog",
  "Notification",
  "EmailLog",
  "ConsentRecord",
  "RateLimitBucket",
  "ChatAssignment",
  "ChatMessage",
  "ChatConversation",
  "ReferralStatusHistory",
  "Reminder",
  "CandidateNote",
  "CandidateAssignment",
  "ApplicationStatusHistory",
  "Application",
  "Referral",
  "PrivateFile",
  "Candidate",
  "Job",
  "CustomerReference",
  "TeamMember",
  "MediaAsset",
  "CmsPage",
  "CmsRevision",
  "TeamLeadDelegation",
  "PasswordResetToken",
  "Session",
  "UserRole",
  "RolePermission",
  "User",
  "Role",
  "Permission",
  "Region",
  "SystemSetting",
];

beforeEach(async () => {
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
  clearSettingsCache();
});

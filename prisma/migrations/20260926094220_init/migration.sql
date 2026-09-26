-- CreateEnum
CREATE TYPE "Bundesland" AS ENUM ('NRW', 'HESSEN', 'RHEINLAND_PFALZ', 'BAYERN');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ENTWURF', 'VEROEFFENTLICHT', 'PAUSIERT', 'ARCHIVIERT');

-- CreateEnum
CREATE TYPE "Einsatzbereich" AS ENUM ('LEH', 'ELEKTROFACHMARKT', 'MESSEN_EVENTS', 'POS_BETREUUNG');

-- CreateEnum
CREATE TYPE "Beschaeftigungsart" AS ENUM ('VOLLZEIT', 'TEILZEIT', 'MINIJOB', 'SELBSTSTAENDIG');

-- CreateEnum
CREATE TYPE "Anforderung" AS ENUM ('ERFORDERLICH', 'VON_VORTEIL', 'NICHT_NOTWENDIG');

-- CreateEnum
CREATE TYPE "CandidateSource" AS ENUM ('WEBSITE', 'INITIATIV', 'MITARBEITEREMPFEHLUNG', 'SONSTIGE');

-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('STELLE', 'INITIATIV');

-- CreateEnum
CREATE TYPE "AutoStatus" AS ENUM ('NEU', 'OFFEN');

-- CreateEnum
CREATE TYPE "ManualStatus" AS ENUM ('INTERESSENTENGESPRAECH_VEREINBART', 'INTERESSENTENGESPRAECH_DURCHGEFUEHRT', 'SCHNUPPERTAG_VEREINBART', 'SCHNUPPERTAG_DURCHGEFUEHRT', 'VERTRAGSGESPRAECH_VEREINBART', 'VERTRAGSGESPRAECH_DURCHGEFUEHRT', 'ZUSAGE', 'ABSAGE');

-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('LINK', 'DIREKT');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('EMPFEHLUNG_NEU', 'KONTAKT_AUSSTEHEND', 'KONTAKTIERT', 'INTERESSE', 'KEIN_INTERESSE', 'IN_BEWERBUNG_UEBERNOMMEN');

-- CreateEnum
CREATE TYPE "IncentiveStatus" AS ENUM ('NICHT_RELEVANT', 'PRUEFUNG', 'FAELLIG', 'ERLEDIGT');

-- CreateEnum
CREATE TYPE "ChatStatus" AS ENUM ('OFFEN', 'BEANTWORTET', 'ERLEDIGT');

-- CreateEnum
CREATE TYPE "ChatSender" AS ENUM ('BESUCHER', 'TEAM', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CmsPageType" AS ENUM ('STANDARD', 'RECHTLICH');

-- CreateEnum
CREATE TYPE "MediaApproval" AS ENUM ('FREIGEGEBEN', 'FREIGABE_ERFORDERLICH', 'GESPERRT');

-- CreateEnum
CREATE TYPE "MediaCategory" AS ENUM ('BRAND', 'POS', 'TEAM', 'TRAINING', 'SONSTIGE');

-- CreateEnum
CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'INTERNAL');

-- CreateEnum
CREATE TYPE "TrainingAssignmentStatus" AS ENUM ('NICHT_EINGELADEN', 'EINGELADEN', 'BEGONNEN', 'IN_BEARBEITUNG', 'ABGESCHLOSSEN');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "regionId" TEXT,
    "mfaSecretEnc" TEXT,
    "mfaEnabledAt" TIMESTAMP(3),
    "recoveryCodeHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "mfaPending" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bundesland" "Bundesland" NOT NULL,
    "city" TEXT NOT NULL,
    "plz" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "einsatzbereich" "Einsatzbereich" NOT NULL,
    "employmentType" "Beschaeftigungsart" NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "intro" TEXT NOT NULL,
    "description" JSONB NOT NULL,
    "tasks" TEXT[],
    "requirements" TEXT[],
    "benefits" TEXT[],
    "contactName" TEXT,
    "contactPhone" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'ENTWURF',
    "publishAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "autoDeactivate" BOOLEAN NOT NULL DEFAULT true,
    "driversLicense" "Anforderung" NOT NULL DEFAULT 'VON_VORTEIL',
    "ownCar" "Anforderung" NOT NULL DEFAULT 'NICHT_NOTWENDIG',
    "cvUploadEnabled" BOOLEAN NOT NULL DEFAULT false,
    "indexable" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "bundesland" "Bundesland" NOT NULL,
    "source" "CandidateSource" NOT NULL DEFAULT 'WEBSITE',
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT,
    "type" "ApplicationType" NOT NULL DEFAULT 'STELLE',
    "bundesland" "Bundesland" NOT NULL,
    "city" TEXT NOT NULL,
    "driversLicense" BOOLEAN NOT NULL,
    "ownCar" BOOLEAN,
    "previousActivity" TEXT NOT NULL,
    "availableFrom" TEXT NOT NULL,
    "message" TEXT,
    "cvFileId" TEXT,
    "autoStatus" "AutoStatus" NOT NULL DEFAULT 'NEU',
    "manualStatus" "ManualStatus",
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsibleRegionId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "source" "CandidateSource" NOT NULL DEFAULT 'WEBSITE',
    "referralId" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "consentVersion" TEXT NOT NULL,
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusHistory" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromAuto" "AutoStatus",
    "fromManual" "ManualStatus",
    "toAuto" "AutoStatus",
    "toManual" "ManualStatus",
    "changedById" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateAssignment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "userId" TEXT,
    "assignedById" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateNote" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "editHistory" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT,
    "applicationId" TEXT,
    "referralId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "dueTime" TEXT,
    "subject" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "createdById" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamLeadDelegation" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamLeadDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "type" "ReferralType" NOT NULL,
    "code" TEXT,
    "referrerFirstName" TEXT NOT NULL,
    "referrerLastName" TEXT NOT NULL,
    "referrerEmail" TEXT,
    "referrerPhone" TEXT,
    "referrerEmployeeNo" TEXT,
    "referredFirstName" TEXT,
    "referredLastName" TEXT,
    "referredEmail" TEXT,
    "referredPhone" TEXT,
    "referredCity" TEXT,
    "referredBundesland" "Bundesland",
    "note" TEXT,
    "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "consentVersion" TEXT,
    "consentAt" TIMESTAMP(3),
    "status" "ReferralStatus" NOT NULL DEFAULT 'EMPFEHLUNG_NEU',
    "convertedCandidateId" TEXT,
    "incentiveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "incentiveStatus" "IncentiveStatus" NOT NULL DEFAULT 'NICHT_RELEVANT',
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralStatusHistory" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "fromStatus" "ReferralStatus",
    "toStatus" "ReferralStatus" NOT NULL,
    "changedById" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "visitorTokenHash" TEXT NOT NULL,
    "visitorName" TEXT,
    "visitorEmail" TEXT,
    "visitorPhone" TEXT,
    "topic" TEXT,
    "status" "ChatStatus" NOT NULL DEFAULT 'OFFEN',
    "startedOffline" BOOLEAN NOT NULL DEFAULT false,
    "assignedUserId" TEXT,
    "internalNote" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAgentReadAt" TIMESTAMP(3),
    "emailNotifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender" "ChatSender" NOT NULL,
    "senderUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatAssignment" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CmsPageType" NOT NULL DEFAULT 'STANDARD',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "publishedRevisionId" TEXT,
    "publishAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsRevision" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "credit" TEXT,
    "approval" "MediaApproval" NOT NULL DEFAULT 'FREIGABE_ERFORDERLICH',
    "category" "MediaCategory" NOT NULL DEFAULT 'SONSTIGE',
    "visibility" "MediaVisibility" NOT NULL DEFAULT 'PUBLIC',
    "focalX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "focalY" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateFile" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerReference" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoMediaId" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCourse" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCourseVersion" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changelog" TEXT,
    "passScore" INTEGER NOT NULL DEFAULT 80,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingCourseVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingModule" (
    "id" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TrainingModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingLesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "sourceSlides" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "TrainingLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingQuestion" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "finalCheck" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TrainingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingQuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TrainingQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAssignment" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "status" "TrainingAssignmentStatus" NOT NULL DEFAULT 'NICHT_EINGELADEN',
    "responsibleRegionId" TEXT,
    "dueAt" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3),
    "firstAccessAt" TIMESTAMP(3),
    "lastAccessAt" TIMESTAMP(3),
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingInvitation" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "firstUsedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProgress" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAnswer" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionIds" TEXT[],
    "correct" BOOLEAN NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCompletion" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scorePct" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,

    CONSTRAINT "TrainingCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingReminderLog" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAsset" (
    "id" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "sourceSlide" INTEGER,
    "caption" TEXT,

    CONSTRAINT "TrainingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'USER',
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "textSnippet" TEXT NOT NULL,
    "candidateId" TEXT,
    "referralId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "windowStartAt" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_regionId_idx" ON "User"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Region_key_key" ON "Region"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

-- CreateIndex
CREATE INDEX "Job_status_bundesland_idx" ON "Job"("status", "bundesland");

-- CreateIndex
CREATE INDEX "Job_publishAt_idx" ON "Job"("publishAt");

-- CreateIndex
CREATE INDEX "Job_expiresAt_idx" ON "Job"("expiresAt");

-- CreateIndex
CREATE INDEX "Candidate_emailNormalized_idx" ON "Candidate"("emailNormalized");

-- CreateIndex
CREATE INDEX "Candidate_phoneNormalized_idx" ON "Candidate"("phoneNormalized");

-- CreateIndex
CREATE INDEX "Candidate_lastName_city_idx" ON "Candidate"("lastName", "city");

-- CreateIndex
CREATE UNIQUE INDEX "Application_cvFileId_key" ON "Application"("cvFileId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_referralId_key" ON "Application"("referralId");

-- CreateIndex
CREATE INDEX "Application_candidateId_idx" ON "Application"("candidateId");

-- CreateIndex
CREATE INDEX "Application_jobId_idx" ON "Application"("jobId");

-- CreateIndex
CREATE INDEX "Application_responsibleRegionId_createdAt_idx" ON "Application"("responsibleRegionId", "createdAt");

-- CreateIndex
CREATE INDEX "Application_autoStatus_manualStatus_idx" ON "Application"("autoStatus", "manualStatus");

-- CreateIndex
CREATE INDEX "Application_createdAt_idx" ON "Application"("createdAt");

-- CreateIndex
CREATE INDEX "ApplicationStatusHistory_applicationId_createdAt_idx" ON "ApplicationStatusHistory"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "CandidateAssignment_applicationId_createdAt_idx" ON "CandidateAssignment"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "CandidateNote_candidateId_createdAt_idx" ON "CandidateNote"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "Reminder_assigneeId_done_dueDate_idx" ON "Reminder"("assigneeId", "done", "dueDate");

-- CreateIndex
CREATE INDEX "Reminder_applicationId_idx" ON "Reminder"("applicationId");

-- CreateIndex
CREATE INDEX "TeamLeadDelegation_toUserId_startsAt_endsAt_idx" ON "TeamLeadDelegation"("toUserId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "TeamLeadDelegation_fromUserId_idx" ON "TeamLeadDelegation"("fromUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_code_key" ON "Referral"("code");

-- CreateIndex
CREATE INDEX "Referral_status_createdAt_idx" ON "Referral"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Referral_referredBundesland_idx" ON "Referral"("referredBundesland");

-- CreateIndex
CREATE INDEX "ReferralStatusHistory_referralId_createdAt_idx" ON "ReferralStatusHistory"("referralId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversation_visitorTokenHash_key" ON "ChatConversation"("visitorTokenHash");

-- CreateIndex
CREATE INDEX "ChatConversation_status_lastMessageAt_idx" ON "ChatConversation"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatAssignment_conversationId_idx" ON "ChatAssignment"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_slug_key" ON "CmsPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_publishedRevisionId_key" ON "CmsPage"("publishedRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsRevision_pageId_version_key" ON "CmsRevision"("pageId", "version");

-- CreateIndex
CREATE INDEX "MediaAsset_category_approval_idx" ON "MediaAsset"("category", "approval");

-- CreateIndex
CREATE INDEX "PrivateFile_candidateId_idx" ON "PrivateFile"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCourse_slug_key" ON "TrainingCourse"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCourseVersion_courseId_version_key" ON "TrainingCourseVersion"("courseId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingModule_courseVersionId_sortOrder_key" ON "TrainingModule"("courseVersionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingLesson_moduleId_sortOrder_key" ON "TrainingLesson"("moduleId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingQuestion_lessonId_sortOrder_key" ON "TrainingQuestion"("lessonId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingQuestionOption_questionId_sortOrder_key" ON "TrainingQuestionOption"("questionId", "sortOrder");

-- CreateIndex
CREATE INDEX "TrainingAssignment_candidateId_idx" ON "TrainingAssignment"("candidateId");

-- CreateIndex
CREATE INDEX "TrainingAssignment_status_idx" ON "TrainingAssignment"("status");

-- CreateIndex
CREATE INDEX "TrainingAssignment_responsibleRegionId_idx" ON "TrainingAssignment"("responsibleRegionId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingInvitation_tokenHash_key" ON "TrainingInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "TrainingInvitation_assignmentId_idx" ON "TrainingInvitation"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingProgress_assignmentId_lessonId_key" ON "TrainingProgress"("assignmentId", "lessonId");

-- CreateIndex
CREATE INDEX "TrainingAnswer_assignmentId_questionId_idx" ON "TrainingAnswer"("assignmentId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCompletion_assignmentId_key" ON "TrainingCompletion"("assignmentId");

-- CreateIndex
CREATE INDEX "TrainingReminderLog_assignmentId_kind_idx" ON "TrainingReminderLog"("assignmentId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingAsset_courseVersionId_mediaAssetId_key" ON "TrainingAsset"("courseVersionId", "mediaAssetId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "EmailLog_status_attempts_idx" ON "EmailLog"("status", "attempts");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_candidateId_idx" ON "ConsentRecord"("candidateId");

-- CreateIndex
CREATE INDEX "ConsentRecord_referralId_idx" ON "ConsentRecord"("referralId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_cvFileId_fkey" FOREIGN KEY ("cvFileId") REFERENCES "PrivateFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_responsibleRegionId_fkey" FOREIGN KEY ("responsibleRegionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAssignment" ADD CONSTRAINT "CandidateAssignment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAssignment" ADD CONSTRAINT "CandidateAssignment_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAssignment" ADD CONSTRAINT "CandidateAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateNote" ADD CONSTRAINT "CandidateNote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateNote" ADD CONSTRAINT "CandidateNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateNote" ADD CONSTRAINT "CandidateNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamLeadDelegation" ADD CONSTRAINT "TeamLeadDelegation_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamLeadDelegation" ADD CONSTRAINT "TeamLeadDelegation_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamLeadDelegation" ADD CONSTRAINT "TeamLeadDelegation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_convertedCandidateId_fkey" FOREIGN KEY ("convertedCandidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralStatusHistory" ADD CONSTRAINT "ReferralStatusHistory_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAssignment" ADD CONSTRAINT "ChatAssignment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAssignment" ADD CONSTRAINT "ChatAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPage" ADD CONSTRAINT "CmsPage_publishedRevisionId_fkey" FOREIGN KEY ("publishedRevisionId") REFERENCES "CmsRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsRevision" ADD CONSTRAINT "CmsRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "CmsPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsRevision" ADD CONSTRAINT "CmsRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateFile" ADD CONSTRAINT "PrivateFile_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReference" ADD CONSTRAINT "CustomerReference_logoMediaId_fkey" FOREIGN KEY ("logoMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCourseVersion" ADD CONSTRAINT "TrainingCourseVersion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingModule" ADD CONSTRAINT "TrainingModule_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "TrainingCourseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingLesson" ADD CONSTRAINT "TrainingLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingQuestion" ADD CONSTRAINT "TrainingQuestion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "TrainingLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingQuestionOption" ADD CONSTRAINT "TrainingQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "TrainingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "TrainingCourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_responsibleRegionId_fkey" FOREIGN KEY ("responsibleRegionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingInvitation" ADD CONSTRAINT "TrainingInvitation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TrainingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingInvitation" ADD CONSTRAINT "TrainingInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgress" ADD CONSTRAINT "TrainingProgress_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TrainingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgress" ADD CONSTRAINT "TrainingProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "TrainingLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAnswer" ADD CONSTRAINT "TrainingAnswer_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TrainingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAnswer" ADD CONSTRAINT "TrainingAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "TrainingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TrainingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "TrainingCourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingReminderLog" ADD CONSTRAINT "TrainingReminderLog_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TrainingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAsset" ADD CONSTRAINT "TrainingAsset_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "TrainingCourseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAsset" ADD CONSTRAINT "TrainingAsset_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

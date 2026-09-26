-- AlterTable
ALTER TABLE "PrivateFile" ADD COLUMN     "pendingDeletionAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PrivateFile_pendingDeletionAt_idx" ON "PrivateFile"("pendingDeletionAt");

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "name" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("name","day")
);

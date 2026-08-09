-- CreateTable
CREATE TABLE "AgentLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "wasteReportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentLog_pkey" PRIMARY KEY ("id")
);

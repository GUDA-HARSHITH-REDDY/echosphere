-- AlterTable
ALTER TABLE "AgentLog" ADD COLUMN     "agentName" TEXT NOT NULL DEFAULT 'eco_agent',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN     "toolCalls" JSONB,
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "SustainabilityPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "days" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SustainabilityPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goal" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserGoal_userId_key" ON "UserGoal"("userId");

-- Bring the recorded migration history up to the application's current schema.
-- Review/baseline an existing database before applying migrations; never reset it.
ALTER TABLE "Issue"
  ADD COLUMN "gpsAccuracy" DOUBLE PRECISION,
  ADD COLUMN "capturedAt" TIMESTAMP(3),
  ADD COLUMN "confidence" DOUBLE PRECISION,
  ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "Issue" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Issue" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Issue"
  ALTER COLUMN "wardId" DROP NOT NULL,
  ALTER COLUMN "surveySessionId" DROP NOT NULL,
  ALTER COLUMN "routeId" DROP NOT NULL;

ALTER TABLE "Issue" DROP CONSTRAINT "Issue_wardId_fkey";
ALTER TABLE "Issue" DROP CONSTRAINT "Issue_surveySessionId_fkey";
ALTER TABLE "Issue" DROP CONSTRAINT "Issue_routeId_fkey";
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_surveySessionId_fkey" FOREIGN KEY ("surveySessionId") REFERENCES "SurveySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IssueResolution"
  ADD COLUMN "repairQualityScore" INTEGER,
  ADD COLUMN "qualityRating" TEXT,
  ADD COLUMN "aiVerdict" TEXT;

CREATE TABLE "IssueAnalysis" (
  "id" TEXT NOT NULL,
  "issueId" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "depthEstimateCm" DOUBLE PRECISION NOT NULL,
  "sizeClass" TEXT NOT NULL,
  "priorityScore" INTEGER NOT NULL,
  "recommendations" TEXT NOT NULL,
  "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IssueAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IssueAnalysis_issueId_key" ON "IssueAnalysis"("issueId");
ALTER TABLE "IssueAnalysis" ADD CONSTRAINT "IssueAnalysis_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

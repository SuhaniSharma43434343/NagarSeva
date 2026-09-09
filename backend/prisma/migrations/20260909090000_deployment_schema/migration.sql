-- Bring the recorded migration history up to the application's current schema.
-- Review/baseline an existing database before applying migrations; never reset it.
-- All column additions are guarded so the migration is safe on a DB that was
-- previously modified with "prisma db push".

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Issue' AND column_name='gpsAccuracy') THEN
    ALTER TABLE "Issue" ADD COLUMN "gpsAccuracy" DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Issue' AND column_name='capturedAt') THEN
    ALTER TABLE "Issue" ADD COLUMN "capturedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Issue' AND column_name='confidence') THEN
    ALTER TABLE "Issue" ADD COLUMN "confidence" DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Issue' AND column_name='updatedAt') THEN
    ALTER TABLE "Issue" ADD COLUMN "updatedAt" TIMESTAMP(3);
    UPDATE "Issue" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
    ALTER TABLE "Issue" ALTER COLUMN "updatedAt" SET NOT NULL;
  END IF;
END $$;

-- Make foreign keys nullable (safe to re-run)
ALTER TABLE "Issue" ALTER COLUMN "wardId" DROP NOT NULL;
ALTER TABLE "Issue" ALTER COLUMN "surveySessionId" DROP NOT NULL;
ALTER TABLE "Issue" ALTER COLUMN "routeId" DROP NOT NULL;

-- Recreate foreign keys with ON DELETE SET NULL (DROP is safe even if they don't exist in this form)
ALTER TABLE "Issue" DROP CONSTRAINT IF EXISTS "Issue_wardId_fkey";
ALTER TABLE "Issue" DROP CONSTRAINT IF EXISTS "Issue_surveySessionId_fkey";
ALTER TABLE "Issue" DROP CONSTRAINT IF EXISTS "Issue_routeId_fkey";
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_surveySessionId_fkey" FOREIGN KEY ("surveySessionId") REFERENCES "SurveySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add repair quality columns to IssueResolution
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='IssueResolution' AND column_name='repairQualityScore') THEN
    ALTER TABLE "IssueResolution" ADD COLUMN "repairQualityScore" INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='IssueResolution' AND column_name='qualityRating') THEN
    ALTER TABLE "IssueResolution" ADD COLUMN "qualityRating" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='IssueResolution' AND column_name='aiVerdict') THEN
    ALTER TABLE "IssueResolution" ADD COLUMN "aiVerdict" TEXT;
  END IF;
END $$;

-- Create IssueAnalysis table if it doesn't exist
CREATE TABLE IF NOT EXISTS "IssueAnalysis" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "IssueAnalysis_issueId_key" ON "IssueAnalysis"("issueId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='IssueAnalysis_issueId_fkey') THEN
    ALTER TABLE "IssueAnalysis" ADD CONSTRAINT "IssueAnalysis_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

import { prisma } from "./prisma.js";

export async function applyUniqueIndexes() {
  console.log("[DATABASE] Ensuring partial unique indexes exist in PostgreSQL...");

  // 1. Partial unique index on RouteAssignment for active assignments (PENDING, IN_PROGRESS)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "route_assignment_active_surveyor_route_idx" 
    ON "RouteAssignment" ("surveyorId", "routeId") 
    WHERE status IN ('PENDING', 'IN_PROGRESS');
  `);

  // 2. Unique index on IssueAssignment to enforce 1 active engineer per Issue
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "issue_assignment_issue_id_idx" 
    ON "IssueAssignment" ("issueId");
  `);

  console.log("✅ Partial unique indexes ensured in PostgreSQL database!");
}

applyUniqueIndexes()
  .catch((e) => {
    console.error("Index creation error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

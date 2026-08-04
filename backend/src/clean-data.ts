import { prisma } from "./lib/prisma.js";

async function cleanPreSeededData() {
  console.log("🧹 Removing all pre-seeded issues, resolutions, and test data...");

  await prisma.issueResolution.deleteMany({});
  await prisma.issueAssignment.deleteMany({});
  await prisma.issueAnalysis.deleteMany({});
  await prisma.issue.deleteMany({});

  console.log("✅ All pre-seeded data successfully removed! System is clean for new uploads.");
}

cleanPreSeededData()
  .catch(console.error)
  .finally(() => process.exit(0));

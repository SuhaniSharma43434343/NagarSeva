import { prisma } from "./lib/prisma.js";

async function solveAllIssues() {
  console.log("🛠️ Resolving Demo Road Pothole Issues...");

  const issues = await prisma.issue.findMany({
    where: { status: "DETECTED" },
  });

  const engineer = await prisma.user.findFirst({
    where: { role: "ENGINEER" },
  }) || await prisma.user.findFirst();

  const fixedAfterImage = "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";

  for (const issue of issues) {
    // 1. Assign to Engineer
    if (engineer) {
      await prisma.issueAssignment.create({
        data: {
          issueId: issue.id,
          engineerId: engineer.id,
          status: "ASSIGNED",
        },
      }).catch(() => {});
    }

    // 2. Mark as FIXED with after-repair image
    await prisma.issue.update({
      where: { id: issue.id },
      data: {
        status: "RESOLVED",
        afterUrl: fixedAfterImage,
      },
    });

    // 3. Attach Resolution Audit & Repair Quality Score
    await prisma.issueResolution.create({
      data: {
        issueId: issue.id,
        approved: true,
        feedback: "Road surface repaired with high-density hot-mix asphalt patching.",
        repairQualityScore: 9.2,
        qualityRating: "EXCELLENT",
        aiVerdict: "Repair verified. Road surface meets safety compliance.",
      },
    }).catch(() => {});
  }

  console.log(`✅ Successfully resolved ${issues.length} issue(s) with AI repair audit!`);
}

solveAllIssues()
  .catch(console.error)
  .finally(() => process.exit(0));

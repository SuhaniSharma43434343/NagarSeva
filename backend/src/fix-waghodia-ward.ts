import { prisma } from "./lib/prisma.js";

async function fixWaghodiaWard() {
  console.log("🛠️ Updating all Wards to 'Ward 5 - Waghodia Road' and linking Demo Road Patrol Corridor to Waghodia Road...");

  await prisma.ward.updateMany({
    data: { name: "Ward 5 - Waghodia Road" }
  });

  const mainWard = await prisma.ward.findFirst();

  if (mainWard) {
    await prisma.route.updateMany({
      data: { wardId: mainWard.id }
    });

    await prisma.issue.updateMany({
      data: { wardId: mainWard.id }
    });

    await prisma.user.updateMany({
      data: { wardId: mainWard.id }
    });
  }

  console.log("✅ Successfully updated all Wards and Routes to 'Ward 5 - Waghodia Road'!");
}

fixWaghodiaWard()
  .catch(console.error)
  .finally(() => process.exit(0));

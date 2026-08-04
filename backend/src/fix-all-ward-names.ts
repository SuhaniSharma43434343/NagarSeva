import { prisma } from "./lib/prisma.js";

async function fixAllWardNames() {
  console.log("🛠️ Renaming all Wards to 'Ward 3 - Central Demo Zone' and all Routes to 'Demo Road Patrol Corridor'...");

  // Update all Wards
  await prisma.ward.updateMany({
    data: {
      name: "Ward 3 - Central Demo Zone",
    },
  });

  // Update all Routes
  await prisma.route.updateMany({
    data: {
      name: "Demo Road Patrol Corridor",
    },
  });

  console.log("✅ Successfully updated all Ward names in DB to 'Ward 3 - Central Demo Zone'!");
}

fixAllWardNames()
  .catch(console.error)
  .finally(() => process.exit(0));

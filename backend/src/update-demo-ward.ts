import { prisma } from "./lib/prisma.js";

async function updateDemoWard() {
  console.log("🛠️ Updating existing DB issues to link to Demo Road Patrol Corridor & Ward 3...");

  let demoWard = await prisma.ward.findFirst() || await prisma.ward.create({
    data: { name: "Ward 3 - Central Demo Zone", number: 99 }
  });

  let demoRoute = await prisma.route.findFirst({
    where: { name: { contains: "Demo Road" } }
  }) || await prisma.route.create({
    data: {
      name: "Demo Road Patrol Corridor",
      wardId: demoWard.id,
      startLat: 22.2873,
      startLon: 73.3616,
      endLat: 22.2950,
      endLon: 73.3700,
      distance: 3.2,
    }
  });

  await prisma.issue.updateMany({
    data: {
      wardId: demoWard.id,
      routeId: demoRoute.id,
    }
  });

  console.log("✅ Updated all DB issues to 'Ward 3 - Central Demo Zone' and 'Demo Road Patrol Corridor'!");
}

updateDemoWard()
  .catch(console.error)
  .finally(() => process.exit(0));

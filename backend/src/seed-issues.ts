import { prisma } from "./lib/prisma.js";

async function seedIssues() {
  console.log("🌱 Seeding Demo Road Pothole Issues for Admin Dashboard...");

  let ward = await prisma.ward.findFirst() || await prisma.ward.create({
    data: { name: "Ward 3 - Central Zone", number: 3 }
  });

  let route = await prisma.route.findFirst({ where: { name: { contains: "Demo Road" } } }) || await prisma.route.create({
    data: {
      name: "Demo Road Patrol Corridor",
      wardId: ward.id,
      startLat: 22.2873,
      startLon: 73.3616,
      endLat: 22.2950,
      endLon: 73.3700,
      distance: 3.2,
    }
  });

  let surveyor = await prisma.user.findFirst({ where: { role: "SURVEYOR" } });
  let assignment = await prisma.routeAssignment.findFirst({ where: { routeId: route.id } }) || await prisma.routeAssignment.create({
    data: {
      surveyorId: surveyor?.id || "default-surveyor-id",
      routeId: route.id,
      status: "COMPLETED",
    }
  });

  let session = await prisma.surveySession.findFirst({ where: { routeAssignmentId: assignment.id } }) || await prisma.surveySession.create({
    data: {
      routeAssignmentId: assignment.id,
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      endedAt: new Date().toISOString(),
    }
  });

  const demoPhotos = [
    {
      lat: 22.2873,
      lon: 73.3616,
      img: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
      conf: 0.94,
    },
    {
      lat: 22.2885,
      lon: 73.3630,
      img: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
      conf: 0.91,
    },
    {
      lat: 22.2900,
      lon: 73.3650,
      img: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80",
      conf: 0.88,
    },
    {
      lat: 22.2915,
      lon: 73.3670,
      img: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80",
      conf: 0.95,
    },
  ];

  for (const item of demoPhotos) {
    const issue = await prisma.issue.create({
      data: {
        type: "POTHOLE",
        status: "DETECTED",
        confidence: item.conf,
        latitude: item.lat,
        longitude: item.lon,
        imageUrl: item.img,
        wardId: ward.id,
        routeId: route.id,
        surveySessionId: session.id,
      }
    });

    await prisma.issueAnalysis.create({
      data: {
        issueId: issue.id,
        severity: "HIGH",
        depthEstimateCm: 5.8,
        sizeClass: "LARGE",
        priorityScore: 8,
        recommendations: "Immediate asphalt filling and structural patching required.",
      }
    }).catch(() => {});
  }

  console.log("✅ Successfully seeded 4 Pothole Issues for Admin Dashboard!");
}

seedIssues()
  .catch(console.error)
  .finally(() => process.exit(0));

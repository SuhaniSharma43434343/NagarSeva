import {
  UserRole,
  IssueType,
  IssueStatus,
  RouteAssignmentStatus,
} from "./generated/prisma/client.js";
import { prisma } from "./lib/prisma.js";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log("🌱 Cleaning existing data & Seeding VMC Civic Issue Monitoring System...");

  // Clean database
  await prisma.issueResolution.deleteMany({});
  await prisma.issueAssignment.deleteMany({});
  await prisma.issue.deleteMany({});
  await prisma.surveySession.deleteMany({});
  await prisma.routeAssignment.deleteMany({});
  await prisma.route.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.ward.deleteMany({});

  /* ===================== WARDS ===================== */
  await prisma.ward.createMany({
    data: [
      { name: "Alkapuri", number: 1 },
      { name: "Sayajigunj", number: 2 },
      { name: "Manjalpur", number: 3 },
      { name: "Karelibaug", number: 4 },
      { name: "Waghodia Road", number: 5 },
    ],
  });

  const wards = await prisma.ward.findMany({
    orderBy: { number: "asc" },
  });

  if (wards.length < 5) throw new Error("Wards not created");

  const ward1 = wards[0]!;
  const ward2 = wards[1]!;
  const ward3 = wards[2]!;
  const ward4 = wards[3]!;
  const ward5 = wards[4]!;

  /* ===================== USERS ===================== */
  const hashedPassword = await hashPassword("password");
  const adminPassword = await hashPassword("admin123");

  await prisma.user.createMany({
    data: [
      {
        name: "Rakesh Sharma",
        email: "admin@vmc.gov.in",
        password: adminPassword,
        role: UserRole.ADMIN,
        wardId: ward1.id,
      },
      {
        name: "Admin System",
        email: "admin@nagarseva.gov.in",
        password: adminPassword,
        role: UserRole.ADMIN,
        wardId: ward1.id,
      },
    ],
  });

  const SURVEYORS: Array<[string, string, string]> = [
    ["Amit Patel", "amit.patel@vmc.gov.in", ward1.id],
    ["Priya Desai", "priya.desai@vmc.gov.in", ward1.id],
    ["Rajesh Mehta", "rajesh.mehta@vmc.gov.in", ward2.id],
    ["Komal Shah", "komal.shah@vmc.gov.in", ward2.id],
    ["Vikram Joshi", "vikram.joshi@vmc.gov.in", ward3.id],
  ];

  await prisma.user.createMany({
    data: SURVEYORS.map(([name, email, wardId]) => ({
      name,
      email,
      password: hashedPassword,
      role: UserRole.SURVEYOR,
      wardId,
    })),
  });

  const ENGINEERS: Array<[string, string, string, "POTHOLE" | "GARBAGE"]> = [
    ["Suresh Pandya", "suresh.pandya@vmc.gov.in", ward1.id, "POTHOLE"],
    ["Hetal Trivedi", "hetal.trivedi@vmc.gov.in", ward1.id, "GARBAGE"],
    ["Mitesh Bhatt", "mitesh.bhatt@vmc.gov.in", ward2.id, "POTHOLE"],
    ["Sneha Raval", "sneha.raval@vmc.gov.in", ward2.id, "GARBAGE"],
    ["Darshan Parmar", "darshan.parmar@vmc.gov.in", ward3.id, "POTHOLE"],
  ];

  await prisma.user.createMany({
    data: ENGINEERS.map(([name, email, wardId, department]) => ({
      name,
      email,
      password: hashedPassword,
      role: UserRole.ENGINEER,
      wardId,
      department,
    })),
  });

  const surveyors = await prisma.user.findMany({
    where: { role: UserRole.SURVEYOR },
    orderBy: { email: "asc" },
  });

  const engineers = await prisma.user.findMany({
    where: { role: UserRole.ENGINEER },
    orderBy: { email: "asc" },
  });

  const surveyor1 = surveyors[0]!;
  const surveyor2 = surveyors[1]!;

  /* ===================== ROUTES ===================== */
  const route1 = await prisma.route.create({
    data: {
      name: "RC Dutt Road",
      wardId: ward1.id,
      startLat: 22.3085,
      startLon: 73.1732,
      endLat: 22.3112,
      endLon: 73.1798,
      distance: 1.8,
    },
  });

  const route2 = await prisma.route.create({
    data: {
      name: "Sayaji Baug Road",
      wardId: ward2.id,
      startLat: 22.311,
      startLon: 73.1875,
      endLat: 22.3076,
      endLon: 73.181,
      distance: 2.1,
    },
  });

  const route3 = await prisma.route.create({
    data: {
      name: "Alkapuri Main Road",
      wardId: ward1.id,
      startLat: 22.3095,
      startLon: 73.172,
      endLat: 22.313,
      endLon: 73.176,
      distance: 2.5,
    },
  });

  const route4 = await prisma.route.create({
    data: {
      name: "Karelibaug Circle Road",
      wardId: ward4.id,
      startLat: 22.3245,
      startLon: 73.195,
      endLat: 22.331,
      endLon: 73.205,
      distance: 2.8,
    },
  });

  const route5 = await prisma.route.create({
    data: {
      name: "Waghodia Road",
      wardId: ward5.id,
      startLat: 22.2965,
      startLon: 73.2185,
      endLat: 22.2852,
      endLon: 73.245,
      distance: 4.5,
    },
  });

  const route6 = await prisma.route.create({
    data: {
      name: "Demo Road Patrol Corridor",
      wardId: ward3.id,
      startLat: 22.2873,
      startLon: 73.3616,
      endLat: 22.2950,
      endLon: 73.3700,
      distance: 3.2,
    },
  });

  /* ===================== ROUTE ASSIGNMENTS (TASKS) ===================== */
  await prisma.routeAssignment.createMany({
    data: [
      {
        routeId: route6.id,
        surveyorId: surveyor1.id,
        status: RouteAssignmentStatus.PENDING,
      },
      {
        routeId: route5.id,
        surveyorId: surveyor1.id,
        status: RouteAssignmentStatus.IN_PROGRESS,
      },
      {
        routeId: route1.id,
        surveyorId: surveyor1.id,
        status: RouteAssignmentStatus.PENDING,
      },
      {
        routeId: route3.id,
        surveyorId: surveyor1.id,
        status: RouteAssignmentStatus.IN_PROGRESS,
      },
      {
        routeId: route2.id,
        surveyorId: surveyor2.id,
        status: RouteAssignmentStatus.PENDING,
      },
      {
        routeId: route4.id,
        surveyorId: surveyor2.id,
        status: RouteAssignmentStatus.PENDING,
      },
    ],
  });

  console.log("✅ Seeding completed successfully with Route Assignments");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

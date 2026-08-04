import { prisma } from './src/lib/prisma.js';

async function seedIssues() {
  console.log('🌱 Seeding sample issues...');

  // Get first route, ward, and a survey session
  const route = await prisma.route.findFirst({ include: { ward: true } });
  if (!route) { console.error('No routes found. Run seed.ts first.'); return; }

  const route2 = await prisma.route.findFirst({ where: { id: { not: route.id } }, include: { ward: true } });
  const route3 = await prisma.route.findFirst({ where: { id: { not: route.id, ...(route2 ? { not: route2.id } : {}) } }, include: { ward: true } });

  // Get surveyors
  const surveyor = await prisma.user.findFirst({ where: { role: 'SURVEYOR' } });
  if (!surveyor) { console.error('No surveyors found.'); return; }

  // Get or create a RouteAssignment
  let assignment = await prisma.routeAssignment.findFirst({ where: { surveyorId: surveyor.id, routeId: route.id } });
  if (!assignment) {
    assignment = await prisma.routeAssignment.create({
      data: { surveyorId: surveyor.id, routeId: route.id }
    });
  }

  // Create a survey session
  const session = await prisma.surveySession.create({
    data: {
      routeAssignmentId: assignment.id,
      startedAt: new Date(Date.now() - 3600000),
      endedAt: new Date(),
    }
  });

  // Seed sample issues
  const issues = [
    {
      type: 'POTHOLE' as const,
      status: 'DETECTED' as const,
      latitude: 22.3085,
      longitude: 73.1732,
      wardId: route.wardId,
      routeId: route.id,
      surveySessionId: session.id,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    },
    {
      type: 'POTHOLE' as const,
      status: 'ASSIGNED' as const,
      latitude: 22.3090,
      longitude: 73.1745,
      wardId: route.wardId,
      routeId: route.id,
      surveySessionId: session.id,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    },
    {
      type: 'GARBAGE' as const,
      status: 'DETECTED' as const,
      latitude: 22.3076,
      longitude: 73.181,
      wardId: route.wardId,
      routeId: route.id,
      surveySessionId: session.id,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    },
    {
      type: 'POTHOLE' as const,
      status: 'IN_PROGRESS' as const,
      latitude: 22.311,
      longitude: 73.1875,
      wardId: route.wardId,
      routeId: route.id,
      surveySessionId: session.id,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    },
    {
      type: 'GARBAGE' as const,
      status: 'FIXED' as const,
      latitude: 22.3095,
      longitude: 73.172,
      wardId: route.wardId,
      routeId: route.id,
      surveySessionId: session.id,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
      afterUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    },
    {
      type: 'POTHOLE' as const,
      status: 'RESOLVED' as const,
      latitude: 22.3100,
      longitude: 73.174,
      wardId: route.wardId,
      routeId: route.id,
      surveySessionId: session.id,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
      afterUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    },
    {
      type: 'GARBAGE' as const,
      status: 'REJECTED' as const,
      latitude: 22.3112,
      longitude: 73.1798,
      wardId: route.wardId,
      routeId: route.id,
      surveySessionId: session.id,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    },
    {
      type: 'POTHOLE' as const,
      status: 'DETECTED' as const,
      latitude: 22.3245,
      longitude: 73.195,
      wardId: route.wardId,
      routeId: route.id,
      surveySessionId: session.id,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    },
  ];

  for (const issue of issues) {
    await prisma.issue.create({ data: issue });
  }

  // Now assign some engineers to the ASSIGNED issues
  const engineer = await prisma.user.findFirst({ where: { role: 'ENGINEER' } });
  const assignedIssues = await prisma.issue.findMany({ where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } });
  if (engineer && assignedIssues.length > 0) {
    for (const issue of assignedIssues) {
      await prisma.issueAssignment.create({
        data: { issueId: issue.id, engineerId: engineer.id }
      });
    }
  }

  console.log(`✅ Seeded ${issues.length} sample issues successfully!`);
}

seedIssues()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

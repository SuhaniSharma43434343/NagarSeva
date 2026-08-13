import { prisma } from "./prisma.js";
import axios from "axios";
import jwt from "jsonwebtoken";

async function runFullTestMatrix() {
  console.log("--- STARTING ASSIGNMENT DUPLICATION & CONCURRENCY TEST MATRIX ---");

  // 1. Setup test entities in DB
  const ward = (await prisma.ward.findFirst()) || (await prisma.ward.create({ data: { name: "Test Ward", number: 888 } }));

  const surveyorA = await prisma.user.create({
    data: { name: "Surveyor A", email: `test_surv_a_${Date.now()}@vmc.gov.in`, password: "hash", role: "SURVEYOR", wardId: ward.id },
  });
  const surveyorB = await prisma.user.create({
    data: { name: "Surveyor B", email: `test_surv_b_${Date.now()}@vmc.gov.in`, password: "hash", role: "SURVEYOR", wardId: ward.id },
  });

  const engineerA = await prisma.user.create({
    data: { name: "Engineer A", email: `test_eng_a_${Date.now()}@vmc.gov.in`, password: "hash", role: "ENGINEER", wardId: ward.id },
  });
  const engineerB = await prisma.user.create({
    data: { name: "Engineer B", email: `test_eng_b_${Date.now()}@vmc.gov.in`, password: "hash", role: "ENGINEER", wardId: ward.id },
  });

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const adminToken = jwt.sign({ userId: admin?.id || surveyorA.id, role: "ADMIN" }, process.env.JWT_SECRET || "secret");

  const routeA = await prisma.route.create({
    data: { name: "Test Route A", wardId: ward.id, startLat: 22.3, startLon: 73.1, endLat: 22.31, endLon: 73.11, distance: 1.2 },
  });
  const routeB = await prisma.route.create({
    data: { name: "Test Route B", wardId: ward.id, startLat: 22.32, startLon: 73.12, endLat: 22.33, endLon: 73.13, distance: 1.5 },
  });
  const routeC = await prisma.route.create({
    data: { name: "Test Route C (Race)", wardId: ward.id, startLat: 22.34, startLon: 73.14, endLat: 22.35, endLon: 73.15, distance: 1.8 },
  });

  const session = await prisma.surveySession.create({
    data: {
      routeAssignmentId: (
        await prisma.routeAssignment.create({ data: { surveyorId: surveyorA.id, routeId: routeA.id, status: "COMPLETED" } })
      ).id,
      startedAt: new Date(),
    },
  });

  const issueA = await prisma.issue.create({
    data: {
      type: "POTHOLE",
      status: "DETECTED",
      latitude: 22.3,
      longitude: 73.1,
      wardId: ward.id,
      routeId: routeA.id,
      surveySessionId: session.id,
      imageUrl: "http://test.com/1.jpg",
    },
  });
  const issueB = await prisma.issue.create({
    data: {
      type: "POTHOLE",
      status: "DETECTED",
      latitude: 22.31,
      longitude: 73.11,
      wardId: ward.id,
      routeId: routeA.id,
      surveySessionId: session.id,
      imageUrl: "http://test.com/2.jpg",
    },
  });
  const issueResolved = await prisma.issue.create({
    data: {
      type: "POTHOLE",
      status: "RESOLVED",
      latitude: 22.32,
      longitude: 73.12,
      wardId: ward.id,
      routeId: routeA.id,
      surveySessionId: session.id,
      imageUrl: "http://test.com/3.jpg",
    },
  });

  const headers = { Authorization: "Bearer " + adminToken };

  const results: any[] = [];

  // Test 1: Surveyor A + Route A -> SUCCESS
  const t1 = await axios.post("http://localhost:3000/api/admin/assignRoute", { surveyorId: surveyorA.id, routeId: routeA.id }, { headers, validateStatus: () => true });
  results.push({ test: "Test 1: Surveyor A + Route A", status: t1.status, message: t1.data.message });

  // Test 2: Surveyor A + Route A duplicate -> HTTP 409
  const t2 = await axios.post("http://localhost:3000/api/admin/assignRoute", { surveyorId: surveyorA.id, routeId: routeA.id }, { headers, validateStatus: () => true });
  results.push({ test: "Test 2: Surveyor A + Route A duplicate -> expect 409", status: t2.status, message: t2.data.message });

  // Test 3: Surveyor A + Route B -> SUCCESS
  const t3 = await axios.post("http://localhost:3000/api/admin/assignRoute", { surveyorId: surveyorA.id, routeId: routeB.id }, { headers, validateStatus: () => true });
  results.push({ test: "Test 3: Surveyor A + Route B", status: t3.status, message: t3.data.message });

  // Test 4: Surveyor B + Route A -> SUCCESS
  const t4 = await axios.post("http://localhost:3000/api/admin/assignRoute", { surveyorId: surveyorB.id, routeId: routeA.id }, { headers, validateStatus: () => true });
  results.push({ test: "Test 4: Surveyor B + Route A", status: t4.status, message: t4.data.message });

  // Test 5: Issue A + Engineer A -> SUCCESS
  const t5 = await axios.post("http://localhost:3000/api/admin/assignSolver", { engineerId: engineerA.id, issueId: issueA.id }, { headers, validateStatus: () => true });
  results.push({ test: "Test 5: Issue A + Engineer A", status: t5.status, message: t5.data.message });

  // Test 6: Issue A + Engineer A duplicate -> HTTP 409
  const t6 = await axios.post("http://localhost:3000/api/admin/assignSolver", { engineerId: engineerA.id, issueId: issueA.id }, { headers, validateStatus: () => true });
  results.push({ test: "Test 6: Issue A + Engineer A duplicate -> expect 409", status: t6.status, message: t6.data.message });

  // Test 7: Issue A + Engineer B (Issue already assigned) -> HTTP 409
  const t7 = await axios.post("http://localhost:3000/api/admin/assignSolver", { engineerId: engineerB.id, issueId: issueA.id }, { headers, validateStatus: () => true });
  results.push({ test: "Test 7: Issue A + Engineer B (already assigned) -> expect 409", status: t7.status, message: t7.data.message });

  // Test 8: Resolved Issue -> expect 400
  const t8 = await axios.post("http://localhost:3000/api/admin/assignSolver", { engineerId: engineerA.id, issueId: issueResolved.id }, { headers, validateStatus: () => true });
  results.push({ test: "Test 8: Resolved Issue assignment -> expect 400", status: t8.status, message: t8.data.message });

  // Role validation tests
  const tRole1 = await axios.post("http://localhost:3000/api/admin/assignRoute", { surveyorId: engineerA.id, routeId: routeA.id }, { headers, validateStatus: () => true });
  results.push({ test: "Role Test: ENGINEER passed to assignRoute -> expect 400", status: tRole1.status, message: tRole1.data.message });

  const tRole2 = await axios.post("http://localhost:3000/api/admin/assignSolver", { engineerId: surveyorA.id, issueId: issueB.id }, { headers, validateStatus: () => true });
  results.push({ test: "Role Test: SURVEYOR passed to assignSolver -> expect 400", status: tRole2.status, message: tRole2.data.message });

  // Concurrency Test (RouteAssignment)
  const raceRouteProms = [
    axios.post("http://localhost:3000/api/admin/assignRoute", { surveyorId: surveyorA.id, routeId: routeC.id }, { headers, validateStatus: () => true }),
    axios.post("http://localhost:3000/api/admin/assignRoute", { surveyorId: surveyorA.id, routeId: routeC.id }, { headers, validateStatus: () => true }),
  ];
  const raceRouteRes = await Promise.all(raceRouteProms);
  const raceRouteStatuses = raceRouteRes.map((r) => r.status).sort();
  const routeCRowCount = await prisma.routeAssignment.count({ where: { surveyorId: surveyorA.id, routeId: routeC.id } });
  results.push({ test: "Concurrency Race Test: assignRoute", statuses: raceRouteStatuses, dbRowCount: routeCRowCount });

  // Concurrency Test (IssueAssignment)
  const raceSolverProms = [
    axios.post("http://localhost:3000/api/admin/assignSolver", { engineerId: engineerA.id, issueId: issueB.id }, { headers, validateStatus: () => true }),
    axios.post("http://localhost:3000/api/admin/assignSolver", { engineerId: engineerA.id, issueId: issueB.id }, { headers, validateStatus: () => true }),
  ];
  const raceSolverRes = await Promise.all(raceSolverProms);
  const raceSolverStatuses = raceSolverRes.map((r) => r.status).sort();
  const issueBRowCount = await prisma.issueAssignment.count({ where: { issueId: issueB.id } });
  results.push({ test: "Concurrency Race Test: assignSolver", statuses: raceSolverStatuses, dbRowCount: issueBRowCount });

  console.log("--- TEST RESULTS ---");
  console.log(JSON.stringify(results, null, 2));

  // Cleanup test entities in correct FK order
  await prisma.issueAssignment.deleteMany({ where: { issueId: { in: [issueA.id, issueB.id, issueResolved.id] } } });
  await prisma.issue.deleteMany({ where: { id: { in: [issueA.id, issueB.id, issueResolved.id] } } });
  await prisma.surveySession.deleteMany({ where: { id: session.id } });
  await prisma.routeAssignment.deleteMany({ where: { surveyorId: { in: [surveyorA.id, surveyorB.id] } } });
  await prisma.route.deleteMany({ where: { id: { in: [routeA.id, routeB.id, routeC.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [surveyorA.id, surveyorB.id, engineerA.id, engineerB.id] } } });

  process.exit(0);
}

runFullTestMatrix();

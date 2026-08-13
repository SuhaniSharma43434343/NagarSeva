import { prisma } from './src/lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import express from 'express';
import { adminRouter } from './src/routes/adminRoutes.js';
import { surveyorRouter } from './src/routes/surveyorRoutes.js';
import { engineerRouter } from './src/routes/engineerRoutes.js';
import type { Server } from 'http';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);
app.use('/api/surveyor', surveyorRouter);
app.use('/api/engineer', engineerRouter);

let server: Server;
const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;

async function setupTestData() {
  let ward = await prisma.ward.findFirst();
  if (!ward) {
    ward = await prisma.ward.create({
      data: { name: 'Test Ward', number: 99 },
    });
  }

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Admin user
  await prisma.user.upsert({
    where: { email: 'test.admin@vmc.gov.in' },
    update: { password: hashedPassword, role: 'ADMIN' },
    create: {
      name: 'Test Admin',
      email: 'test.admin@vmc.gov.in',
      password: hashedPassword,
      role: 'ADMIN',
      wardId: ward.id,
    },
  });

  // Surveyor user
  await prisma.user.upsert({
    where: { email: 'test.surveyor@vmc.gov.in' },
    update: { password: hashedPassword, role: 'SURVEYOR' },
    create: {
      name: 'Test Surveyor',
      email: 'test.surveyor@vmc.gov.in',
      password: hashedPassword,
      role: 'SURVEYOR',
      wardId: ward.id,
    },
  });

  // Engineer user
  await prisma.user.upsert({
    where: { email: 'test.engineer@vmc.gov.in' },
    update: { password: hashedPassword, role: 'ENGINEER' },
    create: {
      name: 'Test Engineer',
      email: 'test.engineer@vmc.gov.in',
      password: hashedPassword,
      role: 'ENGINEER',
      wardId: ward.id,
    },
  });
}

async function runTests() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-12345';
  await setupTestData();

  return new Promise<void>((resolve, reject) => {
    server = app.listen(PORT, async () => {
      console.log(`🧪 Test server running on port ${PORT}`);
      let failed = false;

      const assertEqual = (name: string, actual: any, expected: any) => {
        if (actual === expected) {
          console.log(`✅ [PASS] ${name}`);
        } else {
          console.error(`❌ [FAIL] ${name}: expected ${expected}, got ${actual}`);
          failed = true;
        }
      };

      try {
        // --- 1. LOGIN TESTS ---
        console.log('\n--- 1. Testing Role Enforced Logins ---');

        // Surveyor Login -> Valid Surveyor
        let res = await fetch(`${BASE_URL}/api/surveyor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test.surveyor@vmc.gov.in', password: 'password123' }),
        });
        const surveyorLoginData: any = await res.json();
        assertEqual('Valid SURVEYOR credentials -> /surveyor/login -> 200', res.status, 200);
        assertEqual('Valid SURVEYOR JWT returned', Boolean(surveyorLoginData.token), true);

        // Engineer Login -> Valid Engineer
        res = await fetch(`${BASE_URL}/api/engineer/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test.engineer@vmc.gov.in', password: 'password123' }),
        });
        const engineerLoginData: any = await res.json();
        assertEqual('Valid ENGINEER credentials -> /engineer/login -> 200', res.status, 200);
        assertEqual('Valid ENGINEER JWT returned', Boolean(engineerLoginData.token), true);

        // Admin Login -> Valid Admin
        res = await fetch(`${BASE_URL}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test.admin@vmc.gov.in', password: 'password123' }),
        });
        const adminLoginData: any = await res.json();
        assertEqual('Valid ADMIN credentials -> /admin/login -> 200', res.status, 200);
        assertEqual('Valid ADMIN JWT returned', Boolean(adminLoginData.data?.token), true);

        // --- 2. WRONG ROLE LOGIN REJECTION (403) ---
        console.log('\n--- 2. Testing Wrong-Role Login Attempts (403) ---');

        // Engineer -> /surveyor/login
        res = await fetch(`${BASE_URL}/api/surveyor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test.engineer@vmc.gov.in', password: 'password123' }),
        });
        assertEqual('Engineer credentials -> /surveyor/login -> 403 Forbidden', res.status, 403);

        // Surveyor -> /engineer/login
        res = await fetch(`${BASE_URL}/api/engineer/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test.surveyor@vmc.gov.in', password: 'password123' }),
        });
        assertEqual('Surveyor credentials -> /engineer/login -> 403 Forbidden', res.status, 403);

        // Surveyor -> /admin/login
        res = await fetch(`${BASE_URL}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test.surveyor@vmc.gov.in', password: 'password123' }),
        });
        assertEqual('Surveyor credentials -> /admin/login -> 403 Forbidden', res.status, 403);

        // Engineer -> /admin/login
        res = await fetch(`${BASE_URL}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test.engineer@vmc.gov.in', password: 'password123' }),
        });
        assertEqual('Engineer credentials -> /admin/login -> 403 Forbidden', res.status, 403);

        // --- 3. INVALID CREDENTIALS / BAD PASSWORD (401) ---
        console.log('\n--- 3. Testing Bad Credentials (401) ---');

        res = await fetch(`${BASE_URL}/api/surveyor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test.surveyor@vmc.gov.in', password: 'wrongpassword' }),
        });
        assertEqual('Surveyor with wrong password -> /surveyor/login -> 401 Unauthorized', res.status, 401);

        res = await fetch(`${BASE_URL}/api/engineer/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test.engineer@vmc.gov.in', password: 'wrongpassword' }),
        });
        assertEqual('Engineer with wrong password -> /engineer/login -> 401 Unauthorized', res.status, 401);

        res = await fetch(`${BASE_URL}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test.admin@vmc.gov.in', password: 'wrongpassword' }),
        });
        assertEqual('Admin with wrong password -> /admin/login -> 401 Unauthorized', res.status, 401);

        // --- 4. JWT TOKEN TAMPERING / INVALID TOKEN (401) ---
        console.log('\n--- 4. Testing Missing & Tampered JWT Tokens (401) ---');

        // Missing token
        res = await fetch(`${BASE_URL}/api/admin/surveyors`);
        assertEqual('Protected admin route without Authorization header -> 401', res.status, 401);

        // Invalid token signature
        const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature';
        res = await fetch(`${BASE_URL}/api/admin/surveyors`, {
          headers: { Authorization: `Bearer ${invalidToken}` },
        });
        assertEqual('Protected admin route with invalid token signature -> 401', res.status, 401);

        // Tampered token (signed with wrong secret to fake role: ADMIN)
        const tamperedToken = jwt.sign(
          { userId: 'fake-id', role: 'ADMIN' },
          'wrong-secret-key'
        );
        res = await fetch(`${BASE_URL}/api/admin/surveyors`, {
          headers: { Authorization: `Bearer ${tamperedToken}` },
        });
        assertEqual('Protected admin route with tampered JWT role -> 401', res.status, 401);

        // --- 5. CROSS-ROLE ACCESS (403 vs 200) ---
        console.log('\n--- 5. Testing Cross-Role Access Rules (403 vs 200) ---');

        const surveyorToken = surveyorLoginData.token;
        const engineerToken = engineerLoginData.token;
        const adminToken = adminLoginData.data.token;

        // Surveyor attempting Admin endpoint
        res = await fetch(`${BASE_URL}/api/admin/surveyors`, {
          headers: { Authorization: `Bearer ${surveyorToken}` },
        });
        assertEqual('SURVEYOR token -> GET /api/admin/surveyors -> 403 Forbidden', res.status, 403);

        // Surveyor attempting Engineer endpoint
        res = await fetch(`${BASE_URL}/api/engineer/issues`, {
          headers: { Authorization: `Bearer ${surveyorToken}` },
        });
        assertEqual('SURVEYOR token -> GET /api/engineer/issues -> 403 Forbidden', res.status, 403);

        // Engineer attempting Admin endpoint
        res = await fetch(`${BASE_URL}/api/admin/surveyors`, {
          headers: { Authorization: `Bearer ${engineerToken}` },
        });
        assertEqual('ENGINEER token -> GET /api/admin/surveyors -> 403 Forbidden', res.status, 403);

        // Engineer attempting Surveyor endpoint
        res = await fetch(`${BASE_URL}/api/surveyor/assignments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${engineerToken}` },
        });
        assertEqual('ENGINEER token -> POST /api/surveyor/assignments -> 403 Forbidden', res.status, 403);

        // Admin attempting Surveyor endpoint
        res = await fetch(`${BASE_URL}/api/surveyor/assignments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        assertEqual('ADMIN token -> POST /api/surveyor/assignments -> 403 Forbidden', res.status, 403);

        // Admin accessing Admin endpoint
        res = await fetch(`${BASE_URL}/api/admin/surveyors`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        assertEqual('ADMIN token -> GET /api/admin/surveyors -> 200 OK', res.status, 200);

        // Surveyor accessing Surveyor endpoint
        res = await fetch(`${BASE_URL}/api/surveyor/assignments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${surveyorToken}` },
        });
        assertEqual('SURVEYOR token -> POST /api/surveyor/assignments -> 200 OK', res.status, 200);

        // Engineer accessing Engineer endpoint
        res = await fetch(`${BASE_URL}/api/engineer/issues`, {
          headers: { Authorization: `Bearer ${engineerToken}` },
        });
        assertEqual('ENGINEER token -> GET /api/engineer/issues -> 200 OK', res.status, 200);

        server.close();

        if (failed) {
          console.error('\n❌ Test suite completed with errors.');
          process.exit(1);
        } else {
          console.log('\n🎉 ALL ROLE-BASED AUTHENTICATION & AUTHORIZATION TESTS PASSED SUCCESSFULLY!');
          resolve();
        }
      } catch (err) {
        server.close();
        console.error('Test runner exception:', err);
        reject(err);
      }
    });
  });
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});

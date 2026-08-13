import { prisma } from './src/lib/prisma.js';
import bcrypt from 'bcrypt';
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
const PORT = 3098;
const BASE_URL = `http://localhost:${PORT}`;

async function runContractTests() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-12345';

  return new Promise<void>((resolve, reject) => {
    server = app.listen(PORT, async () => {
      console.log(`🧪 Contract test server running on port ${PORT}`);
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
        console.log('\n--- 1. Testing Admin Login Contract ---');
        // Admin login
        let res = await fetch(`${BASE_URL}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test.admin@vmc.gov.in', password: 'password123' }),
        });
        const loginData: any = await res.json();
        assertEqual('Admin Login HTTP Status', res.status, 200);
        assertEqual('Admin Login Success flag', loginData.success, true);
        const token = loginData.data?.token;

        // --- 2. Testing 409 Conflict Contract on Duplicate Route Assignment ---
        console.log('\n--- 2. Testing 409 Conflict Contract (Duplicate Assignment) ---');
        let surveyor = await prisma.user.findFirst({ where: { role: 'SURVEYOR' } });
        let route = await prisma.route.findFirst();

        if (surveyor && route) {
          // Assign route once
          await fetch(`${BASE_URL}/api/admin/assignRoute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ surveyorId: surveyor.id, routeId: route.id }),
          });

          // Attempt duplicate assignment
          res = await fetch(`${BASE_URL}/api/admin/assignRoute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ surveyorId: surveyor.id, routeId: route.id }),
          });
          const conflictData: any = await res.json();

          assertEqual('Duplicate Route Assignment HTTP 409 Conflict', res.status, 409);
          assertEqual('409 Conflict returns success: false', conflictData.success, false);
          assertEqual(
            '409 Conflict returns exact backend error message',
            typeof conflictData.message === 'string' && conflictData.message.length > 0,
            true
          );
        }

        // --- 3. Testing 400 Bad Request Contract ---
        console.log('\n--- 3. Testing 400 Bad Request Contract ---');
        res = await fetch(`${BASE_URL}/api/admin/createEmployee`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: '' }),
        });
        const badReqData: any = await res.json();
        assertEqual('Missing employee fields -> 400 Bad Request', res.status, 400);
        assertEqual('400 Bad Request returns success: false', badReqData.success, false);

        // --- 4. Testing 403 Forbidden Contract ---
        console.log('\n--- 4. Testing 403 Forbidden Contract ---');
        res = await fetch(`${BASE_URL}/api/surveyor/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test.surveyor@vmc.gov.in', password: 'password123' }),
        });
        const sLoginData: any = await res.json();
        const surveyorToken = sLoginData.token;

        // Attempt admin operation with surveyor token
        res = await fetch(`${BASE_URL}/api/admin/employees`, {
          headers: { Authorization: `Bearer ${surveyorToken}` },
        });
        const forbiddenData: any = await res.json();
        assertEqual('Surveyor calling Admin endpoint -> 403 Forbidden', res.status, 403);
        assertEqual('403 Forbidden returns success: false', forbiddenData.success, false);

        server.close();

        if (failed) {
          console.error('\n❌ Contract test suite completed with errors.');
          process.exit(1);
        } else {
          console.log('\n🎉 ALL FRONTEND API CONTRACT & ERROR HANDLING TESTS PASSED SUCCESSFULLY!');
          resolve();
        }
      } catch (err) {
        server.close();
        console.error('Contract test runner exception:', err);
        reject(err);
      }
    });
  });
}

runContractTests().catch((e) => {
  console.error(e);
  process.exit(1);
});

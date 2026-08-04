import { prisma } from './src/lib/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- ALL USERS IN DB ---');
  for (const u of users) {
    const match = await bcrypt.compare('admin123', u.password);
    console.log(`User: ${u.email} | Role: ${u.role} | Password match with "admin123": ${match}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

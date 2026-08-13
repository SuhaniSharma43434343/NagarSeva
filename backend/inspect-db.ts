import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });
import { prisma } from './src/lib/prisma.js';

async function main() {
  const wards = await prisma.ward.findMany();
  const routes = await prisma.route.findMany();
  const issues = await prisma.issue.findMany({ take: 10, include: { ward: true, route: true } });
  
  console.log('=== WARDS IN DB ===');
  console.log(JSON.stringify(wards, null, 2));
  
  console.log('\n=== ROUTES IN DB ===');
  console.log(JSON.stringify(routes, null, 2));

  console.log('\n=== RECENT ISSUES IN DB ===');
  issues.forEach(i => {
    console.log(`ID: ${i.id} | lat: ${i.latitude} | lon: ${i.longitude} | Ward: ${i.ward?.name} (id: ${i.wardId}) | Route: ${i.route?.name} (id: ${i.routeId})`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);

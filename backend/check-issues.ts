import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const issues = await prisma.issue.findMany({ 
    take: 5, 
    include: { analysis: true, ward: true, route: true } 
  });
  
  console.log('Total issues found:', issues.length);
  issues.forEach(i => {
    console.log(`ID: ${i.id.substring(0, 8)}... | Type: ${i.type} | Status: ${i.status} | Ward: ${i.ward?.name} | Route: ${i.route?.name} | HasAnalysis: ${!!i.analysis}`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);

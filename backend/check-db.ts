import { prisma } from './src/lib/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
  const alkapuriWard = await prisma.ward.findFirst({ where: { number: 1 }, include: { routes: true } });
  if (alkapuriWard && alkapuriWard.routes.length > 0) {
    const updated = await prisma.issue.updateMany({
      data: {
        wardId: alkapuriWard.id,
        routeId: alkapuriWard.routes[0].id,
      },
    });
    console.log(`Re-assigned ${updated.count} issues to Ward 1 - Alkapuri (${alkapuriWard.routes[0].name})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

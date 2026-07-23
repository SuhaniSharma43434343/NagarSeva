import { prisma } from './src/lib/prisma.js';
import bcrypt from 'bcrypt';
import { UserRole } from './src/generated/prisma/client.js';

async function main() {
  const adminEmails = ['admin@vmc.gov.in', 'admin@nagarseva.gov.in'];
  const ward = await prisma.ward.findFirst();
  if (!ward) {
      console.log("No wards found!");
      return;
  }
  const hash = await bcrypt.hash('admin123', 10);

  for (const email of adminEmails) {
    let admin = await prisma.user.findUnique({ where: { email } });
    if (!admin) {
      console.log(`Admin ${email} not found, creating...`);
      admin = await prisma.user.create({
        data: {
          name: 'Rakesh Sharma',
          email: email,
          password: hash,
          role: UserRole.ADMIN,
          wardId: ward.id,
        }
      });
      console.log(`Admin ${email} created.`);
    } else {
      console.log(`Admin ${email} already exists.`);
      const match = await bcrypt.compare('admin123', admin.password);
      console.log(`Password match with admin123 for ${email}:`, match);
      if (!match) {
          await prisma.user.update({
              where: { email },
              data: { password: hash }
          });
          console.log(`Reset password for ${email} to admin123`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

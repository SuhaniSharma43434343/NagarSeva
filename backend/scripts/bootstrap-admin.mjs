// Explicit one-time setup. Does not seed demo data or reset existing users.
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const { DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_WARD_NAME, ADMIN_WARD_NUMBER } = process.env;
if (!DATABASE_URL || !ADMIN_EMAIL || !ADMIN_NAME || !ADMIN_WARD_NAME || !ADMIN_WARD_NUMBER || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 16) {
  throw new Error("Set DATABASE_URL, ADMIN_EMAIL, ADMIN_NAME, ADMIN_WARD_NAME, ADMIN_WARD_NUMBER and ADMIN_PASSWORD (16+ characters).");
}
const number = Number(ADMIN_WARD_NUMBER);
if (!Number.isInteger(number) || number < 1) throw new Error("ADMIN_WARD_NUMBER must be a positive integer");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
try {
  if (await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })) throw new Error("User already exists; no changes made.");
  const password = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.$transaction(async tx => {
    const ward = await tx.ward.upsert({ where: { number }, update: {}, create: { number, name: ADMIN_WARD_NAME } });
    await tx.user.create({ data: { email: ADMIN_EMAIL, name: ADMIN_NAME, password, role: "ADMIN", wardId: ward.id } });
  });
  console.log("Administrator created. Remove bootstrap credentials from the environment.");
} finally { await prisma.$disconnect(); }

import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 })
const prisma = new PrismaClient({ adapter })

export { prisma }

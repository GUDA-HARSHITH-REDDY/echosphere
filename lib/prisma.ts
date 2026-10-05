import "dotenv/config"
import { Pool } from "pg"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient
  pgPool?: Pool
}

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_f1kDqI6obyXS@ep-summer-waterfall-awj4kre2.c-12.us-east-1.aws.neon.tech/neondb?sslmode=verify-full"

const pool =
  globalForPrisma.pgPool ||
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  })

const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
  globalForPrisma.pgPool = pool
}
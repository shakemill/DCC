import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

if (typeof PrismaClient === 'undefined') {
  throw new Error(
    'PrismaClient is undefined. Run "prisma generate" before build (e.g. pnpm run build).'
  )
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { prisma }

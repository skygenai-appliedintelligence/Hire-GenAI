import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Robust env loader: .env.local -> .env; do not override existing process.env
try {
  const envLocalPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envLocalPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envLocalPath))
    // Always prefer .env.local for DB URLs
    if (parsed.DATABASE_URL) process.env.DATABASE_URL = parsed.DATABASE_URL
    if (parsed.DIRECT_URL) process.env.DIRECT_URL = parsed.DIRECT_URL
    // For other vars, do not overwrite existing
    for (const [k, v] of Object.entries(parsed)) {
      if (k === 'DATABASE_URL' || k === 'DIRECT_URL') continue
      if (process.env[k] == null) process.env[k] = v
    }
  }
  const envPath = path.join(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envPath))
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] == null) process.env[k] = v
    }
  }
} catch {}

// Avoid creating multiple instances during hot-reload in dev
const globalForPrisma = global as unknown as { prisma?: PrismaClient }

// Normalize and fallback (trim and strip quotes)
const strip = (v?: string) => (v || '').trim().replace(/^['"]|['"]$/g, '')
let databaseUrl = strip(process.env.DATABASE_URL)
let directUrl = strip(process.env.DIRECT_URL)
const prismaUrl = strip(process.env.POSTGRES_PRISMA_URL)
const postgresUrl = strip(process.env.POSTGRES_URL)
const unpooled = strip(process.env.DATABASE_URL_UNPOOLED) || strip(process.env.POSTGRES_URL_NON_POOLING)

// Prefer .env.local assignments already injected above
// If still missing or invalid, try provider-specific fallbacks
const isInvalid = (u?: string) => !u || !/^postgres(ql)?:\/\//i.test(u)

if (isInvalid(databaseUrl)) {
  if (!isInvalid(prismaUrl)) {
    databaseUrl = prismaUrl
    process.env.DATABASE_URL = databaseUrl
    console.log('Prisma: Using POSTGRES_PRISMA_URL for DATABASE_URL')
  } else if (!isInvalid(postgresUrl)) {
    databaseUrl = postgresUrl
    process.env.DATABASE_URL = databaseUrl
    console.log('Prisma: Using POSTGRES_URL for DATABASE_URL')
  } else if (!isInvalid(directUrl)) {
    databaseUrl = directUrl
    process.env.DATABASE_URL = databaseUrl
    console.log('Prisma: Using DIRECT_URL for DATABASE_URL')
  }
}

// Set DIRECT_URL if not present using unpooled URL
if (!directUrl && unpooled) {
  process.env.DIRECT_URL = unpooled
}

if (databaseUrl && !/^postgres(ql)?:\/\//i.test(databaseUrl)) {
  console.error('Prisma: DATABASE_URL has invalid scheme. Expected postgres:// or postgresql://, got:', databaseUrl)
}

// Do NOT override datasources; let Prisma read from env internally
export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma



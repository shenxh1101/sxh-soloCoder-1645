import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

let prisma: PrismaClient | null = null;

export async function initDatabase(): Promise<PrismaClient> {
  if (prisma) return prisma;

  const dbDir = path.join(process.cwd(), 'prisma');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }

  return prisma;
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return prisma;
}

export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

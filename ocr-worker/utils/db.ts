import { PrismaClient } from "../src/generated/client"; 

declare global {
  var prismaClient: PrismaClient | undefined;
}

const prismaClient = globalThis.prismaClient || new PrismaClient();

export const prisma = prismaClient;

import { PrismaClient } from "@prisma/client";

declare global {
  var prismaClient: PrismaClient | undefined;
}

const prismaClient = globalThis.prismaClient || new PrismaClient();

export const prisma = prismaClient;

import { PrismaClient } from "../generated/prisma";

declare global {
  var prismaClient: PrismaClient | undefined;
}

const prismaClient = globalThis.prismaClient || new PrismaClient();

export const prisma = prismaClient;

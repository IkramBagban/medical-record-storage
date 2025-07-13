import { AccountType, UserRole } from "@prisma/client";
import { prisma } from "../../utils/db";
import { testEmail } from "./common";

export const createUser = async ({
  email = testEmail,
  name = "Test User",
  accountType = AccountType.FREEMIUM,
  role = UserRole.PATIENT,
}) => {
  return await prisma.user.create({
    data: {
      email,
      name,
      accountType,
      role,
    },
  });
};

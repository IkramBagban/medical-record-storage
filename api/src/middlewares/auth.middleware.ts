import { Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../utils/db";
import { ExtendedRequest } from "../types/common";
import { throwError } from "../utils/error";

export const authMiddleware = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  try {
    if (!authHeader?.startsWith("Bearer ")) {
      throwError("No token provided.", 401);
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token) as { id: string };
    console.log("Decoded token:", decoded);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throwError("Invalid token. User not found.", 401);
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

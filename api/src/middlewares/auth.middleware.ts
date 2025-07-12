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
  try {
    const token = req.cookies.authToken;

    if (!token) {
      throwError("No token provided.", 401);
      return;
    }

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
    res.clearCookie("authToken");
    next(err);
  }
};

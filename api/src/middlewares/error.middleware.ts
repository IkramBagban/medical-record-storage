import { PrismaClientInitializationError } from "@prisma/client/runtime/library";
import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = null;
  let message = null;

  if (err instanceof PrismaClientInitializationError) {
    statusCode = 503;
    message = "Database connection error. Please try again later.";
  } else {
    statusCode = err.statusCode || 500;
    message = err.message || "Internal Server Error";
  }

  console.error("Error:", err);
  res.status(statusCode).json({ error: message, success: false });
};

import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
} from "@prisma/client/runtime/library";
import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = null;
  let message = null;

  if (err instanceof PrismaClientInitializationError) {
    statusCode = 503;
    message = "Database connection error. Please try again later.";
  } else if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const fields = err.meta?.target as string[] | undefined;
      message = `Duplicate value for unique field${fields?.length === 1 ? "" : "s"}: ${fields?.join(", ")}`;
      statusCode = 409;
    }
  } else {
    statusCode = err.statusCode || 500;
    message = err.message || "Internal Server Error";
  }

  console.error("Error:", err);
  res.status(statusCode).json({ error: message, success: false });
};

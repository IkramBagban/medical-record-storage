import { Request } from "express";

export const getClientIp = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  return typeof forwarded === "string"
    ? forwarded.split(",")[0]
    : req.socket.remoteAddress || "";
};

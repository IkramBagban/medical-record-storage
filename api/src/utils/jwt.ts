import jwt, { JwtPayload, Secret } from "jsonwebtoken";

const JWT_SECRET: Secret = process.env.JWT_SECRET || "super-secret";

export const generateToken = (payload: JwtPayload) => {
  return jwt.sign(payload, JWT_SECRET);
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};

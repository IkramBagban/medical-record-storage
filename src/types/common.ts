import { Request } from "express";
import { User } from "../generated/prisma";

export interface ExtendedRequest extends Request {
  user?: User;
}

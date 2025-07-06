import { NextFunction, Response } from "express";
import { rbac } from "../lib/rbac/rbac";
import { ExtendedRequest } from "../types/common";
import { throwError } from "../utils/error";
import { UserRole } from "../generated/prisma";
import { Actions } from "../utils/constants";

export const enforcePermission = (requiredPermissions: Actions[]) => {
  return async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const role = req.user?.role;

      console.log(`Role detected: ${role}`);
      console.log(`Required permissions: ${requiredPermissions}`);

      if (!rbac.hasPermission(role as UserRole, requiredPermissions)) {
        throwError("Forbidden: You do not have the required permissions.", 403);
        return;
      }

      next();
    } catch (err) {
      console.error("RBAC Middleware Error:", err);
      next(err);
    }
  };
};

export const enforceRole = (requiredRoles: UserRole[]) => {
  return async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const role = req.user?.role;

      console.log(`Role detected: ${role}`);
      console.log(`Required role: ${requiredRoles}`);

      if (!rbac.hasRole(role as UserRole, requiredRoles)) {
        throwError("Forbidden: You do not have the required role.", 403);
        return;
      }

      next();
    } catch (err) {
      console.error("RBAC Middleware Error:", err);
      next(err);
    }
  };
};

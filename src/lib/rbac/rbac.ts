import { UserRole } from "../../generated/prisma";
import { Actions } from "../../utils/constants";
import { RolePermissions } from "./permissions";

export class RBAC {
  hasPermission(role: UserRole, permissions: Actions[]): boolean {
    const allowed = RolePermissions[role] || [];
    return permissions.every((permission) => allowed.includes(permission));
  }

  hasRole(userRole: UserRole, roles: UserRole[]): boolean {
    return roles.some((role) => role === userRole);
  }
}

export const rbac = new RBAC();

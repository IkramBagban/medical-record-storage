import { UserRole } from "../../generated/prisma";
import { Actions } from "../../utils/constants";

export const RolePermissions: Record<UserRole, Actions[]> = {
  [UserRole.CAREGIVER]: [
    Actions.GET_UPLOAD_URL,
    Actions.UPLOAD_RECORD,
    Actions.GET_RECORDS,
    Actions.GET_RECORD,
    Actions.DELETE_RECORD,
    Actions.REQUEST_CAREGIVER_ACCESS,
    Actions.GET_CAREGIVER_REQUESTS,
  ],
  [UserRole.PATIENT]: [
    Actions.GET_UPLOAD_URL,
    Actions.UPLOAD_RECORD,
    Actions.GET_RECORDS,
    Actions.GET_RECORD,
    Actions.DELETE_RECORD,
    Actions.APPROVE_CAREGIVER_REQUEST,
    Actions.GET_CAREGIVER_REQUESTS,
  ],
  [UserRole.DEPENDENT]: [
    Actions.GET_RECORDS,
    Actions.GET_RECORD,
    Actions.APPROVE_CAREGIVER_REQUEST,
    Actions.GET_CAREGIVER_REQUESTS,
  ],
};

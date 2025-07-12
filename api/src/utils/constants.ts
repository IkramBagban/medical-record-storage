export enum Actions {
  GET_UPLOAD_URL = "get_upload_url",
  UPLOAD_RECORD = "upload_record",
  GET_RECORDS = "get_records",
  GET_RECORD = "get_record",
  DELETE_RECORD = "delete_record",
  REQUEST_CAREGIVER_ACCESS = "request_caregiver_access",
  APPROVE_CAREGIVER_REQUEST = "approve_caregiver_request",
  GET_CAREGIVER_REQUESTS = "get_caregiver_requests",
}

export const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/pdf",
  "text/plain",
];

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 24 * 60 * 60 * 1000,
};

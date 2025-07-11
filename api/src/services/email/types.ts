export interface IEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface IEmailProvider {
  send({ to, subject, html }: IEmailOptions): Promise<void>;
}

export enum FeaturePermission {
  UPLOAD_RECORD = "UPLOAD_RECORD",
}

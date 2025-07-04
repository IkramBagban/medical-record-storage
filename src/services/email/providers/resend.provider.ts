import { Resend } from "resend";
import { IEmailOptions, IEmailProvider } from "../types";

export class ResendProvider implements IEmailProvider {
  private resend: Resend;

  constructor() {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      throw new Error("Resend API key or from email is missing.");
    }
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async send({ to, subject, html }: IEmailOptions): Promise<void> {
    await this.resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject,
      html,
    });
  }
}

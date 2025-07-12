import { otpTemplate } from "./templates/otp.template";
import { IEmailProvider } from "./types";
import { ResendProvider } from "./providers/resend.provider";

export class EmailService {
  private static instance: EmailService;
  emailProvider: IEmailProvider;

  private constructor() {
    this.emailProvider = new ResendProvider();
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(
    to: string,
    subject: string,
    template: string,
  ): Promise<void> {
    if (!to || !subject || !template) {
      throw new Error(
        "To, subject, and template are required to send an email.",
      );
    }
    const msg = {
      to: to,
      subject: subject,
      html: template,
    };
    try {
      await this.emailProvider.send(msg);
      console.log("Email sent successfully to:", to);
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send email. Please try again.");
    }
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const subject = "Your OTP Code";
    const template = otpTemplate(otp);
    await this.sendEmail(to, subject, template);
  }
}

export const emailService = EmailService.getInstance();

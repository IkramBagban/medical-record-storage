import sgMail from "@sendgrid/mail";
import { otpTemplate } from "./templates/otp.template";

// @ts-ignore
import nodemailer from "nodemailer";
// @ts-ignore
import sendGridTransport from "nodemailer-sendgrid-transport";
import { CreateEmailOptions, Resend } from "resend";
import { IEmailProvider } from "./types";
import { SendGridProvider } from "./providers/sendgrid.provider";
const resend = new Resend(process.env.RESEND_API_KEY!);

// resend.emails.send({
//   from: "onboarding@resend.dev",
//   to: "bagbanikram@gmail.com",
//   subject: "Hello World",
//   html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
// });

export class EmailService {
  private static instance: EmailService;
  // transporter: nodemailer.Transporter;
  emailProvider: IEmailProvider;

  private constructor() {
    this.emailProvider = new SendGridProvider();
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
    template: string
  ): Promise<void> {
    // if (!process.env.SENDGRID_FROM_EMAIL) {
    //   throw new Error(
    //     "SendGrid from email is not set in environment variables."
    //   );
    // }
    if (!to || !subject || !template) {
      throw new Error(
        "To, subject, and template are required to send an email."
      );
    }
    const msg = {
      to: to,
      subject: subject,
      html: template,
    };
    try {
      const emailResponse = await this.emailProvider.send(msg);
      console.log("Email sent successfully:", emailResponse);
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send email. Please try again.");
    }

    console.log("Email sent");
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const subject = "Your OTP Code";
    const template = otpTemplate(otp);
    await this.sendEmail(to, subject, template);
  }
}

export const emailService = EmailService.getInstance();

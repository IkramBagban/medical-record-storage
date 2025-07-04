import sgMail from "@sendgrid/mail";
import { IEmailOptions, IEmailProvider } from "../types";

export class SendGridProvider implements IEmailProvider {
  constructor() {
    // if (!process.env.SENDGRID_API_KEY) {
    //   throw new Error("SendGrid API key is not set in environment variables.");
    // }
    // // sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    // console.log("Creating Nodemailer transporter with SendGrid");
    // this.transporter = nodemailer.createTransport(
    //   sendGridTransport({
    //     auth: {
    //       api_key: process.env.SENDGRID_API_KEY,
    //     },
    //   })
    // );

    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      throw new Error("SendGrid credentials missing");
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async send({ to, subject, html }: IEmailOptions): Promise<void> {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject,
      html,
    });
  }
}

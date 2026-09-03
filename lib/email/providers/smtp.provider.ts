// lib/email/providers/smtp.provider.ts
//
// Unlike payrolldesk (which had no mail library available and hand-rolled a
// minimal SMTP client over raw sockets), this project already depends on
// nodemailer — so the SMTP provider is just a thin adapter over it.

import nodemailer from "nodemailer";
import type { EmailProvider, EmailOptions, EmailResult } from "./interface";

export interface SmtpConfig {
  host: string;
  port: number;
  /** true = implicit TLS from the first byte (port 465). false = plaintext then STARTTLS (port 587/25). */
  secure: boolean;
  user: string;
  password: string;
}

export class SMTPProvider implements EmailProvider {
  constructor(private config: SmtpConfig) {}

  private transporter() {
    return nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.user ? { user: this.config.user, pass: this.config.password } : undefined,
    });
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const info = await this.transporter().sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      });
      return { success: true, messageId: info.messageId as string };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Échec de l'envoi SMTP.",
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      return await this.transporter().verify();
    } catch {
      return false;
    }
  }
}

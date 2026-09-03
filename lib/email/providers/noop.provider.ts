// lib/email/providers/noop.provider.ts
//
// Used whenever no real provider is configured (no saved config and no env
// vars) — this is what let the app run without any mail setup before this
// system existed (nodemailer's `jsonTransport`). It never actually sends
// anything; it logs the email and reports success so callers can show the
// resulting link/data in the UI instead of depending on a mail server.

import type { EmailProvider, EmailOptions, EmailResult } from "./interface";

export class NoopProvider implements EmailProvider {
  async send(options: EmailOptions): Promise<EmailResult> {
    const to = Array.isArray(options.to) ? options.to.join(", ") : options.to;
    console.log(`[email simulated] to=${to} subject="${options.subject}" (no provider configured)`);
    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`,
    };
  }

  async verifyConnection(): Promise<boolean> {
    return true;
  }
}

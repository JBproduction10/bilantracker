// lib/email/providers/resend.provider.ts
import type { EmailProvider, EmailOptions, EmailResult } from "./interface";

export class ResendProvider implements EmailProvider {
  constructor(private apiKey: string) {}

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: options.from,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          ...(options.text && { text: options.text }),
          ...(options.replyTo && { reply_to: options.replyTo }),
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { success: false, error: `Erreur Resend (${res.status}): ${body}` };
      }

      const data = await res.json();
      return { success: true, messageId: data.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Impossible de joindre Resend.",
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      // Resend has no dedicated "ping" endpoint — GET on /emails validates the
      // API key without sending anything (a bad key gets 401, a good one 200).
      const res = await fetch("https://api.resend.com/emails", {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

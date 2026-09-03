// lib/email/providers/sendgrid.provider.ts
import type { EmailProvider, EmailOptions, EmailResult } from "./interface";

function parseFrom(from?: string): { email: string; name?: string } {
  // Accepts either "Name <email@x.com>" or a bare "email@x.com".
  const match = from?.match(/^"?([^"<]*)"?\s*<(.+)>$/);
  if (match) return { name: match[1].trim() || undefined, email: match[2].trim() };
  return { email: from ?? "" };
}

export class SendGridProvider implements EmailProvider {
  constructor(private apiKey: string) {}

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const from = parseFrom(options.from);
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: (Array.isArray(options.to) ? options.to : [options.to]).map((email) => ({
                email,
              })),
            },
          ],
          from,
          subject: options.subject,
          content: [
            ...(options.text ? [{ type: "text/plain", value: options.text }] : []),
            { type: "text/html", value: options.html },
          ],
          ...(options.replyTo && { reply_to: { email: options.replyTo } }),
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { success: false, error: `Erreur SendGrid (${res.status}): ${body}` };
      }

      return { success: true, messageId: res.headers.get("x-message-id") ?? undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Impossible de joindre SendGrid.",
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch("https://api.sendgrid.com/v3/user/profile", {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

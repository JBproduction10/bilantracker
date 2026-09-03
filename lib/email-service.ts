// lib/email-service.ts
//
// Central place every outgoing email goes through — ported from
// payrolldesk's lib/email-service.ts. Loads the saved EmailConfig (cached
// briefly to avoid a DB round-trip per email), builds whichever provider
// it's configured for, and falls back to env vars (SMTP_HOST/SMTP_USER/
// SMTP_PASS, RESEND_API_KEY, SENDGRID_API_KEY — the way this app sent
// email before this config system existed) for as long as nothing has
// been saved in Settings. If neither a saved config nor env vars give a
// real provider, falls back further to a NoopProvider that logs instead
// of sending — this is what previously let the app run with no mail setup
// at all (nodemailer's jsonTransport). Nothing about account creation,
// password resets, payslips, etc. ever depends on email actually
// succeeding; callers treat a failed/simulated send as "show the link/data
// in the UI instead", not as an error.

import {
  getEmailConfig,
  resolveSenderIdentity,
  type EmailConfigDoc,
  type EmailNotificationType,
} from "./email-config-data";
import { ResendProvider } from "./email/providers/resend.provider";
import { SendGridProvider } from "./email/providers/sendgrid.provider";
import { SMTPProvider } from "./email/providers/smtp.provider";
import { NoopProvider } from "./email/providers/noop.provider";
import type { EmailProvider, EmailOptions, EmailResult, EmailProviderKind } from "./email/providers/interface";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  config: EmailConfigDoc | null;
  provider: EmailProvider;
  loadedAt: number;
}

function inferProviderFromEnv(): EmailProviderKind {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  return "smtp"; // matches this app's pre-existing SMTP_HOST/SMTP_USER/SMTP_PASS env vars
}

class EmailService {
  private cache: CacheEntry | null = null;

  private buildProvider(config: EmailConfigDoc | null): EmailProvider {
    const provider = config?.provider ?? inferProviderFromEnv();

    switch (provider) {
      case "sendgrid": {
        const apiKey = config?.sendgrid?.apiKey || process.env.SENDGRID_API_KEY || "";
        return apiKey ? new SendGridProvider(apiKey) : new NoopProvider();
      }
      case "smtp": {
        const host = config?.smtp?.host || process.env.SMTP_HOST || "";
        if (!host) return new NoopProvider();
        return new SMTPProvider({
          host,
          port: config?.smtp?.port || Number(process.env.SMTP_PORT) || 587,
          secure: config?.smtp?.secure ?? process.env.SMTP_SECURE === "true",
          user: config?.smtp?.user || process.env.SMTP_USER || "",
          password: config?.smtp?.password || process.env.SMTP_PASS || "",
        });
      }
      case "resend":
      default: {
        const apiKey = config?.resend?.apiKey || process.env.RESEND_API_KEY || "";
        return apiKey ? new ResendProvider(apiKey) : new NoopProvider();
      }
    }
  }

  private async loadEntry(): Promise<CacheEntry> {
    if (this.cache && Date.now() - this.cache.loadedAt < CACHE_TTL_MS) return this.cache;

    let config: EmailConfigDoc | null = null;
    try {
      config = await getEmailConfig();
    } catch (err) {
      // No MONGODB_URI, DB unreachable, etc. — fall through to env vars
      // (or the Noop provider) rather than failing every email send.
      console.error("Impossible de charger la config email, repli sur les variables d'environnement :", err);
    }

    const entry: CacheEntry = { config, provider: this.buildProvider(config), loadedAt: Date.now() };
    this.cache = entry;
    return entry;
  }

  private fromHeader(config: EmailConfigDoc | null, schoolId?: string | null): string {
    const identity = resolveSenderIdentity(config, schoolId);
    return `"${identity.fromName}" <${identity.fromEmail}>`;
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Sends one email. If `notificationType` is given and that toggle has
   * been switched off in Settings, this is a silent no-op that still
   * reports success (the caller shouldn't treat "the admin turned this
   * off" as an error). `schoolId`, when given, picks that school's "from"/
   * reply-to identity over the global default — see resolveSenderIdentity
   * in email-config-data.
   */
  async send(
    options: EmailOptions,
    notificationType?: EmailNotificationType,
    schoolId?: string | null,
  ): Promise<EmailResult> {
    const { config, provider } = await this.loadEntry();

    if (notificationType && config?.notifications[notificationType] === false) {
      return { success: true, messageId: "disabled" };
    }

    const identity = resolveSenderIdentity(config, schoolId);
    const withDefaults: EmailOptions = {
      ...options,
      from: options.from ?? this.fromHeader(config, schoolId),
      replyTo: options.replyTo ?? identity.replyTo,
      text: options.text ?? this.htmlToText(options.html),
    };

    return provider.send(withDefaults);
  }

  async verifyConnection(): Promise<boolean> {
    const { provider } = await this.loadEntry();
    return provider.verifyConnection();
  }

  async testEmail(to: string, schoolId?: string | null): Promise<EmailResult> {
    return this.send(
      {
        to,
        subject: "Email de test — École Bilan",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#24211d;">
            <h2>Email de test</h2>
            <p>Ceci est un email de test envoyé depuis les paramètres email d'École Bilan.</p>
            <p>Si vous recevez ce message, votre configuration fonctionne correctement.</p>
            <p style="color:#9a9384;font-size:12px;">Envoyé le ${new Date().toLocaleString("fr-FR")}</p>
          </div>
        `,
      },
      undefined,
      schoolId,
    );
  }

  /** Call after saving new settings so the next send picks them up immediately instead of waiting out the cache TTL. */
  clearCache(): void {
    this.cache = null;
  }
}

export const emailService = new EmailService();

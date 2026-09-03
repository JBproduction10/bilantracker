// lib/email-config-data.ts
//
// Ported from payrolldesk's lib/db/email-config.ts, adapted to this app's
// single-tenant shape: there's one deployment (not one config per org), so
// the config document lives at a fixed _id instead of being keyed by an
// org owner. Per-school "from" identity overrides still exist, keyed by
// School id, the same way payrolldesk keys them by Client id — every
// school sends through the same provider account, but a payslip or receipt
// from École X shouldn't look like it came from École Y.

import { getDb } from "./mongodb";
import type { EmailProviderKind } from "./email/providers/interface";

const CONFIG_ID = "global";

export interface SenderIdentity {
  fromName: string;
  fromEmail: string;
  replyTo?: string;
}

export interface EmailConfigDoc {
  _id: string;
  provider: EmailProviderKind;
  smtp?: { host: string; port: number; secure: boolean; user: string; password: string };
  sendgrid?: { apiKey: string };
  resend?: { apiKey: string };
  /** Used when no schoolId applies, and as the fallback for a school without its own override. */
  defaultIdentity: SenderIdentity;
  /** Per-school "from" identity overrides, keyed by School id. */
  schoolIdentities: Record<string, SenderIdentity>;
  notifications: {
    invite: boolean;
    passwordReset: boolean;
    payslip: boolean;
    receipt: boolean;
  };
  updatedAt: string;
}

export type EmailNotificationType = keyof EmailConfigDoc["notifications"];

export const DEFAULT_NOTIFICATIONS: EmailConfigDoc["notifications"] = {
  invite: true,
  passwordReset: true,
  payslip: true,
  receipt: true,
};

export const DEFAULT_SENDER_IDENTITY: SenderIdentity = {
  fromName: "École Bilan",
  fromEmail: "",
};

function collection() {
  return getDb().then((db) => db.collection<EmailConfigDoc>("emailConfig"));
}

/** Returns the saved config, or null if nobody has configured one yet (env-var fallback applies). */
export async function getEmailConfig(): Promise<EmailConfigDoc | null> {
  const col = await collection();
  return col.findOne({ _id: CONFIG_ID });
}

/**
 * The "from" identity to actually send with: that school's override if it
 * has one, else the global default — merged field by field, so a school
 * that only set a from-email still inherits the default from-name/reply-to.
 */
export function resolveSenderIdentity(
  config: EmailConfigDoc | null,
  schoolId?: string | null,
): SenderIdentity {
  const fallback: SenderIdentity = {
    fromName: config?.defaultIdentity?.fromName || process.env.MAIL_FROM_NAME || "École Bilan",
    fromEmail: config?.defaultIdentity?.fromEmail || process.env.MAIL_FROM || "payroll@ledger.io",
    replyTo: config?.defaultIdentity?.replyTo,
  };
  const override = schoolId ? config?.schoolIdentities?.[schoolId] : undefined;
  if (!override) return fallback;
  return {
    fromName: override.fromName || fallback.fromName,
    fromEmail: override.fromEmail || fallback.fromEmail,
    replyTo: override.replyTo || fallback.replyTo,
  };
}

/**
 * Creates or updates the transport config (provider, credentials, default
 * identity, notification toggles). `patch` only needs the fields being
 * changed — the provider-specific credential blocks (smtp/sendgrid/resend)
 * are merged shallowly so, e.g., saving a new default from-name doesn't
 * wipe out a previously-saved API key for a provider that isn't currently
 * selected. Per-school identities are untouched here — see
 * saveSchoolSenderIdentity below.
 */
export async function saveEmailConfig(
  patch: Partial<Omit<EmailConfigDoc, "_id" | "updatedAt" | "schoolIdentities">>,
): Promise<EmailConfigDoc> {
  const col = await collection();
  const existing = await col.findOne({ _id: CONFIG_ID });

  const next: EmailConfigDoc = {
    _id: CONFIG_ID,
    provider: patch.provider ?? existing?.provider ?? "smtp",
    defaultIdentity: patch.defaultIdentity
      ? { ...existing?.defaultIdentity, ...patch.defaultIdentity }
      : (existing?.defaultIdentity ?? DEFAULT_SENDER_IDENTITY),
    smtp: patch.smtp ? { ...existing?.smtp, ...patch.smtp } : existing?.smtp,
    sendgrid: patch.sendgrid ? { ...existing?.sendgrid, ...patch.sendgrid } : existing?.sendgrid,
    resend: patch.resend ? { ...existing?.resend, ...patch.resend } : existing?.resend,
    schoolIdentities: existing?.schoolIdentities ?? {},
    notifications: {
      ...DEFAULT_NOTIFICATIONS,
      ...existing?.notifications,
      ...patch.notifications,
    },
    updatedAt: new Date().toISOString(),
  };

  await col.replaceOne({ _id: CONFIG_ID }, next, { upsert: true });
  return next;
}

/**
 * Sets (or, passing `null`, clears) one school's "from" identity override.
 * Seeds the rest of the config with sane defaults if nothing has been
 * saved yet, same as saveEmailConfig would.
 */
export async function saveSchoolSenderIdentity(
  schoolId: string,
  identity: SenderIdentity | null,
): Promise<EmailConfigDoc> {
  const col = await collection();
  const existing = await col.findOne({ _id: CONFIG_ID });

  const schoolIdentities = { ...existing?.schoolIdentities };
  if (identity) {
    schoolIdentities[schoolId] = identity;
  } else {
    delete schoolIdentities[schoolId];
  }

  const next: EmailConfigDoc = {
    _id: CONFIG_ID,
    provider: existing?.provider ?? "smtp",
    defaultIdentity: existing?.defaultIdentity ?? DEFAULT_SENDER_IDENTITY,
    smtp: existing?.smtp,
    sendgrid: existing?.sendgrid,
    resend: existing?.resend,
    schoolIdentities,
    notifications: { ...DEFAULT_NOTIFICATIONS, ...existing?.notifications },
    updatedAt: new Date().toISOString(),
  };

  await col.replaceOne({ _id: CONFIG_ID }, next, { upsert: true });
  return next;
}

// lib/mailer.ts
//
// Every outgoing email in this app goes through this file. Internally it
// now routes through lib/email-service.ts (provider selection, per-school
// sender identity, notification toggles — see Settings → Email) instead of
// talking to nodemailer directly. The exported functions below keep their
// original signatures/return shapes so nothing calling them needs to
// change: each still resolves to { simulated, messageId, link? }.
//
// Unlike the old direct-nodemailer version, a delivery failure here never
// throws — it's logged to the console and reported back as a normal
// (non-simulated) result with no messageId, the same way payrolldesk's
// email system treats a failed send. Nothing about account creation,
// password resets, or payslip/receipt delivery should ever be blocked by
// an email provider having a bad day; the caller can show the link/data
// directly in the UI instead.

import { emailService } from "./email-service";
import type { EmailNotificationType } from "./email-config-data";

export interface SendResult {
  simulated: boolean;
  messageId: string;
  /** Always returned so an authenticated caller can show/copy it as a fallback. */
  link: string;
}

async function sendVia(
  notificationType: EmailNotificationType,
  params: { to: string; subject: string; html: string; link: string; schoolId?: string | null },
): Promise<SendResult> {
  const result = await emailService.send(
    { to: params.to, subject: params.subject, html: params.html },
    notificationType,
    params.schoolId,
  );
  if (!result.success) {
    console.error(`[email échoué] ${params.to}: ${result.error ?? "erreur inconnue"} — lien : ${params.link}`);
  }
  return { simulated: !!result.simulated, messageId: result.messageId ?? "", link: params.link };
}

export function baseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

/* ------------------------------ invite email ------------------------------ */

export interface SendInviteEmailArgs {
  to: string;
  name: string;
  roleLabel: string;
  schoolName?: string;
  token: string;
  /** The school this account is scoped to, if any — picks that school's from-address. */
  schoolId?: string | null;
}

export async function sendInviteEmail({
  to, name, roleLabel, schoolName, token, schoolId,
}: SendInviteEmailArgs): Promise<SendResult> {
  const link = `${baseUrl()}/set-password?token=${token}`;
  const context = schoolName ? `${roleLabel} — ${schoolName}` : roleLabel;
  return sendVia("invite", {
    to,
    subject: "Votre compte École Bilan — créez votre mot de passe",
    html: wrapEmailHtml({
      heading: "Bienvenue sur École Bilan",
      body: `Bonjour ${escapeHtml(name)}, un compte a été créé pour vous sur École Bilan
        (<strong>${escapeHtml(context)}</strong>). Pour l'activer, choisissez votre mot de passe.`,
      buttonLabel: "Choisir mon mot de passe",
      link,
      footnote: "Ce lien expire dans 7 jours. Si vous ne vous attendiez pas à cet email, vous pouvez l'ignorer.",
    }),
    link,
    schoolId,
  });
}

/* --------------------------- password reset email --------------------------- */

export interface SendPasswordResetEmailArgs {
  to: string;
  name: string;
  token: string;
  /** The school this account is scoped to, if any — picks that school's from-address. */
  schoolId?: string | null;
}

/**
 * Sends a "reset your password" email. Unlike sendInviteEmail, the caller
 * (the public /forgot-password endpoint) must NEVER return this result's
 * link back in an API response — only log/email it — or anyone could
 * hijack an account just by knowing its email address.
 */
export async function sendPasswordResetEmail({
  to, name, token, schoolId,
}: SendPasswordResetEmailArgs): Promise<SendResult> {
  const link = `${baseUrl()}/reset-password?token=${token}`;
  return sendVia("passwordReset", {
    to,
    subject: "Réinitialiser votre mot de passe — École Bilan",
    html: wrapEmailHtml({
      heading: "Réinitialiser votre mot de passe",
      body: `Bonjour ${escapeHtml(name)}, une réinitialisation de mot de passe a été demandée
        pour votre compte École Bilan. Cliquez ci-dessous pour en choisir un nouveau.`,
      buttonLabel: "Réinitialiser mon mot de passe",
      link,
      footnote:
        "Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email — votre mot de passe actuel reste inchangé.",
    }),
    link,
    schoolId,
  });
}

/* ------------------------------ payslip email ------------------------------ */

export interface SendPayslipEmailArgs {
  to: string;
  employeeName: string;
  schoolName: string;
  period: string;
  net: number;
  /** Which school this payslip is for — picks that school's from-address. */
  schoolId?: string | null;
}

/**
 * Sends an actual payslip email. Unlike sendInviteEmail/
 * sendPasswordResetEmail, this has no "link" concept to fall back to — a
 * payslip is the payload itself, not something you visit a URL for — so
 * on failure the caller should mark the delivery as failed (sendAllDrafts
 * already does) rather than pretend it went out.
 */
export async function sendPayslipEmail({
  to, employeeName, schoolName, period, net, schoolId,
}: SendPayslipEmailArgs): Promise<{ simulated: boolean; messageId: string }> {
  const result = await emailService.send(
    {
      to,
      subject: `Votre fiche de paie de ${period} — ${schoolName}`,
      html: wrapPlainHtml(`
        <h2 style="margin-bottom:4px;">${escapeHtml(schoolName)}</h2>
        <p style="color:#6b6558;margin-top:0;">Fiche de paie — ${escapeHtml(period)}</p>
        <p style="color:#4b463d;">Bonjour ${escapeHtml(employeeName)}, votre fiche de paie pour
          ${escapeHtml(period)} est prête.</p>
        <div style="margin-top:20px;background:#1F6E4D;color:#fff;border-radius:10px;padding:16px 20px;
                    display:flex;justify-content:space-between;align-items:center;">
          <span style="opacity:.85;">Net à payer</span>
          <span style="font-size:20px;font-weight:700;">${money(net)}</span>
        </div>
        <p style="color:#9a9384;font-size:12px;margin-top:20px;">
          Ceci est un email automatique. Pour toute question, contactez l'administration de votre école.
        </p>
      `),
    },
    "payslip",
    schoolId,
  );
  if (!result.success) {
    console.error(
      `[fiche de paie échouée] ${to}: ${result.error ?? "erreur inconnue"} — fiche de ${period} pour ${employeeName}`,
    );
  }
  return { simulated: !!result.simulated, messageId: result.messageId ?? "" };
}

/* --------------------------- receipt email --------------------------- */

export interface SendReceiptEmailArgs {
  to: string;
  guardianName: string;
  studentName: string;
  className: string;
  schoolName: string;
  period: string;
  payments: { date: string; amount: number; method: string }[];
  totalPaid: number;
  amountDue: number;
  /** Which school this student belongs to — picks that school's from-address. */
  schoolId?: string | null;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Espèces",
  mobile_money: "Mobile Money",
  bank_transfer: "Virement bancaire",
  other: "Autre",
};

export async function sendReceiptEmail({
  to, guardianName, studentName, className, schoolName, period, payments, totalPaid, amountDue, schoolId,
}: SendReceiptEmailArgs): Promise<{ simulated: boolean; messageId: string }> {
  const balance = amountDue - totalPaid;
  const rows = payments
    .map(
      (p) => `
        <tr>
          <td style="padding:4px 0;color:#4b463d;">${escapeHtml(p.date)}</td>
          <td style="padding:4px 0;color:#4b463d;">${escapeHtml(PAYMENT_METHOD_LABELS[p.method] || p.method)}</td>
          <td style="padding:4px 0;text-align:right;color:#1f5c40;">${money(p.amount)}</td>
        </tr>`,
    )
    .join("");

  const result = await emailService.send(
    {
      to,
      subject: `Reçu de paiement — ${studentName} — ${period}`,
      html: wrapPlainHtml(`
        <h2 style="margin-bottom:4px;">${escapeHtml(schoolName)}</h2>
        <p style="color:#6b6558;margin-top:0;">
          Reçu de paiement pour ${escapeHtml(studentName)} (${escapeHtml(className)}) — ${escapeHtml(period)}
        </p>
        <p style="color:#4b463d;">Bonjour ${escapeHtml(guardianName)}, voici le reçu des paiements
          enregistrés pour cette période.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          ${rows || `<tr><td style="padding:8px 0;color:#9a9384;">Aucun paiement enregistré pour cette période.</td></tr>`}
        </table>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr>
            <td style="padding-top:8px;border-top:1px solid #e6e0d4;font-weight:600;">Total payé</td>
            <td style="padding-top:8px;border-top:1px solid #e6e0d4;text-align:right;font-weight:600;">${money(totalPaid)}</td>
          </tr>
          <tr>
            <td style="padding-top:4px;font-weight:600;">Montant dû</td>
            <td style="padding-top:4px;text-align:right;font-weight:600;">${money(amountDue)}</td>
          </tr>
          <tr>
            <td style="padding-top:4px;font-weight:700;color:#9a3b2b;">Solde restant</td>
            <td style="padding-top:4px;text-align:right;font-weight:700;color:#9a3b2b;">${money(balance)}</td>
          </tr>
        </table>
        <p style="color:#9a9384;font-size:12px;margin-top:20px;">Ceci est un message automatique d'École Bilan.</p>
      `),
    },
    "receipt",
    schoolId,
  );
  if (!result.success) {
    console.error(
      `[reçu échoué] ${to}: ${result.error ?? "erreur inconnue"} — ${studentName} pour ${period}`,
    );
  }
  return { simulated: !!result.simulated, messageId: result.messageId ?? "" };
}

/* ------------------------- generic notification email ------------------------- */

export interface SendNotificationEmailArgs {
  to: string;
  name?: string;
  title: string;
  message: string;
  /** Path within the app the button should open, e.g. "/purchase-orders". Defaults to the app's home. */
  link?: string;
  schoolId?: string | null;
}

/**
 * Mirrors an in-app notification (the bell icon) by email, so a recipient
 * who isn't currently logged in still finds out — a purchase order
 * waiting on Bonté Service, a salary grid decided, a school flagging
 * payroll as ready to send, etc. One toggle ("inApp" in Settings → Email)
 * covers every NotificationType, unlike invite/passwordReset/payslip/
 * receipt which each gate one specific direct-action email.
 */
export async function sendNotificationEmail({
  to, name, title, message, link, schoolId,
}: SendNotificationEmailArgs): Promise<SendResult> {
  const path = link ? (link.startsWith("/") ? link : `/${link}`) : "/dashboard";
  const target = `${baseUrl()}${path}`;
  return sendVia("inApp", {
    to,
    subject: title,
    html: wrapEmailHtml({
      heading: title,
      body: `${name ? `Bonjour ${escapeHtml(name)}, ` : ""}${escapeHtml(message)}`,
      buttonLabel: "Voir dans École Bilan",
      link: target,
      footnote: "Vous recevez cet email car cette notification vous concerne dans École Bilan. Vous pouvez désactiver ces emails dans Paramètres → Email.",
    }),
    link: target,
    schoolId,
  });
}

/* --------------------------------- shared --------------------------------- */

function money(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FC`;
}

function wrapPlainHtml(inner: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#24211d;">${inner}</div>`;
}

function wrapEmailHtml(params: {
  heading: string;
  body: string;
  buttonLabel: string;
  link: string;
  footnote: string;
}): string {
  return wrapPlainHtml(`
    <h2 style="margin-bottom:4px;">${params.heading}</h2>
    <p style="color:#6b6558;">${params.body}</p>
    <p style="margin:24px 0;">
      <a href="${params.link}"
         style="background:#1F6E4D;color:#fff;padding:10px 18px;border-radius:8px;
                text-decoration:none;font-weight:600;display:inline-block;">
        ${params.buttonLabel}
      </a>
    </p>
    <p style="color:#9a9384;font-size:12px;">${params.footnote}</p>
  `);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter: Mail | undefined;
function getTransporter(): Mail {
  if (transporter) return transporter;
  transporter = hasSmtp
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : nodemailer.createTransport({ jsonTransport: true }); // simulated: logs instead of sending
  return transporter;
}

export interface SendPayslipEmailArgs {
  to: string;
  employeeName: string;
  schoolName: string;
  period: string;
  net: number;
}

export async function sendPayslipEmail({ to, employeeName, schoolName, period, net }: SendPayslipEmailArgs) {
  const from = process.env.MAIL_FROM || "payroll@ledger.io";
  const info = await getTransporter().sendMail({
    from,
    to,
    subject: `Your ${period} payslip from ${schoolName}`,
    text: `Hi ${employeeName},\n\nYour payslip for ${period} is ready. Net pay: $${net.toLocaleString()}.\n\n- ${schoolName} Payroll`,
  });
  return { simulated: !hasSmtp, messageId: info.messageId as string };
}

export function baseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export interface SendInviteEmailArgs {
  to: string;
  name: string;
  roleLabel: string;
  schoolName?: string;
  token: string;
}

export async function sendInviteEmail({ to, name, roleLabel, schoolName, token }: SendInviteEmailArgs) {
  const from = process.env.MAIL_FROM || "payroll@ledger.io";
  const link = `${baseUrl()}/set-password?token=${token}`;
  const context = schoolName ? `${roleLabel} — ${schoolName}` : roleLabel;
  const info = await getTransporter().sendMail({
    from,
    to,
    subject: "Votre compte École Bilan — créez votre mot de passe",
    text:
      `Bonjour ${name},\n\n` +
      `Un compte a été créé pour vous sur École Bilan (${context}).\n\n` +
      `Pour l'activer, choisissez votre mot de passe ici :\n${link}\n\n` +
      `Ce lien expire dans 7 jours. Si vous ne vous attendiez pas à cet email, vous pouvez l'ignorer.\n\n` +
      `- École Bilan`,
  });
  return { simulated: !hasSmtp, messageId: info.messageId as string, link };
}

export { hasSmtp };

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
}

export async function sendReceiptEmail({
  to, guardianName, studentName, className, schoolName, period, payments, totalPaid, amountDue,
}: SendReceiptEmailArgs) {
  const from = process.env.MAIL_FROM || "payroll@ledger.io";
  const methodLabels: Record<string, string> = {
    cash: "Espèces", mobile_money: "Mobile Money", bank_transfer: "Virement bancaire", other: "Autre",
  };
  const lines = payments
    .map((p) => `  - ${p.date} · ${(methodLabels[p.method] || p.method)} · ${p.amount.toLocaleString("fr-FR")} FC`)
    .join("\n");
  const balance = amountDue - totalPaid;
  const info = await getTransporter().sendMail({
    from,
    to,
    subject: `Reçu de paiement — ${studentName} — ${period}`,
    text:
      `Bonjour ${guardianName},\n\n` +
      `Voici le reçu des paiements enregistrés pour ${studentName} (${className}) — ${schoolName} — ${period} :\n\n` +
      `${lines || "  (aucun paiement enregistré pour cette période)"}\n\n` +
      `Total payé : ${totalPaid.toLocaleString("fr-FR")} FC\n` +
      `Montant dû : ${amountDue.toLocaleString("fr-FR")} FC\n` +
      `Solde restant : ${balance.toLocaleString("fr-FR")} FC\n\n` +
      `- ${schoolName}`,
  });
  return { simulated: !hasSmtp, messageId: info.messageId as string };
}

export interface SendPasswordResetEmailArgs {
  to: string;
  name: string;
  token: string;
}

export async function sendPasswordResetEmail({ to, name, token }: SendPasswordResetEmailArgs) {
  const from = process.env.MAIL_FROM || "payroll@ledger.io";
  const link = `${baseUrl()}/reset-password?token=${token}`;
  const info = await getTransporter().sendMail({
    from,
    to,
    subject: "Réinitialiser votre mot de passe — École Bilan",
    text:
      `Bonjour ${name},\n\n` +
      `Une réinitialisation de mot de passe a été demandée pour votre compte École Bilan.\n\n` +
      `Pour choisir un nouveau mot de passe, cliquez ici :\n${link}\n\n` +
      `Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email — votre mot de passe actuel reste inchangé.\n\n` +
      `- École Bilan`,
  });
  return { simulated: !hasSmtp, messageId: info.messageId as string, link };
}

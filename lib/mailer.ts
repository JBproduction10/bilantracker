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

export { hasSmtp };

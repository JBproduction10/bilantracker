import { withAuth, json } from "@/lib/apiHelpers";
import { isSuperAdmin, requireCondition } from "@/lib/authz";
import { getEmailConfig, saveEmailConfig, type EmailConfigDoc } from "@/lib/email-config-data";
import { emailService } from "@/lib/email-service";

/** Never send saved credentials back to the browser — only whether one is set. */
function toClientShape(config: EmailConfigDoc | null) {
  return {
    provider: config?.provider ?? "smtp",
    defaultIdentity: {
      fromName: config?.defaultIdentity?.fromName ?? "École Bilan",
      fromEmail: config?.defaultIdentity?.fromEmail ?? "",
      replyTo: config?.defaultIdentity?.replyTo ?? "",
    },
    smtp: {
      host: config?.smtp?.host ?? "",
      port: config?.smtp?.port ?? 587,
      secure: config?.smtp?.secure ?? false,
      user: config?.smtp?.user ?? "",
      hasPassword: Boolean(config?.smtp?.password),
    },
    sendgrid: { hasApiKey: Boolean(config?.sendgrid?.apiKey) },
    resend: { hasApiKey: Boolean(config?.resend?.apiKey) },
    notifications: {
      invite: config?.notifications?.invite ?? true,
      passwordReset: config?.notifications?.passwordReset ?? true,
      payslip: config?.notifications?.payslip ?? true,
      receipt: config?.notifications?.receipt ?? true,
      inApp: config?.notifications?.inApp ?? true,
    },
    configured: Boolean(config),
    updatedAt: config?.updatedAt ?? null,
  };
}

export const GET = withAuth(async (_req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Seul l'administrateur du site peut voir les paramètres email.");
  const config = await getEmailConfig();
  return json(toClientShape(config));
});

interface SaveBody {
  provider?: "resend" | "sendgrid" | "smtp";
  defaultIdentity?: { fromName?: string; fromEmail?: string; replyTo?: string };
  smtp?: { host?: string; port?: number; secure?: boolean; user?: string; password?: string };
  sendgrid?: { apiKey?: string };
  resend?: { apiKey?: string };
  notifications?: Partial<EmailConfigDoc["notifications"]>;
}

export const POST = withAuth(async (req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Seul l'administrateur du site peut modifier les paramètres email.");
  const body: SaveBody = await req.json();

  const fromEmail = body.defaultIdentity?.fromEmail;
  if (!fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    return json({ error: "Une adresse email d'expédition valide est requise." }, { status: 400 });
  }

  // Blank credential fields mean "leave the saved one alone" (the client
  // never receives real secrets back, so it can't round-trip them) —
  // build only the sub-objects that actually have something new in them.
  const smtp =
    body.smtp && (body.smtp.host || body.smtp.password || body.smtp.user)
      ? {
          host: body.smtp.host ?? "",
          port: body.smtp.port ?? 587,
          secure: body.smtp.secure ?? false,
          user: body.smtp.user ?? "",
          ...(body.smtp.password ? { password: body.smtp.password } : {}),
        }
      : undefined;
  const sendgrid = body.sendgrid?.apiKey ? { apiKey: body.sendgrid.apiKey } : undefined;
  const resend = body.resend?.apiKey ? { apiKey: body.resend.apiKey } : undefined;

  const saved = await saveEmailConfig({
    provider: body.provider,
    defaultIdentity: {
      fromName: body.defaultIdentity?.fromName || "École Bilan",
      fromEmail,
      replyTo: body.defaultIdentity?.replyTo || undefined,
    },
    ...(smtp && { smtp: smtp as EmailConfigDoc["smtp"] }),
    ...(sendgrid && { sendgrid }),
    ...(resend && { resend }),
    ...(body.notifications && { notifications: body.notifications as EmailConfigDoc["notifications"] }),
  });

  emailService.clearCache();

  return json(toClientShape(saved));
});

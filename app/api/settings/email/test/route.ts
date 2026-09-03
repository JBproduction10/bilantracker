import { withAuth, json } from "@/lib/apiHelpers";
import { isSuperAdmin, requireCondition } from "@/lib/authz";
import { emailService } from "@/lib/email-service";

export const POST = withAuth(async (req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Seul l'administrateur du site peut envoyer un email de test.");
  const body: { to?: string; schoolId?: string } = await req.json();

  const to = body.to?.trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return json({ error: "Une adresse email valide est requise." }, { status: 400 });
  }

  const connectionVerified = await emailService.verifyConnection();
  const result = await emailService.testEmail(to, body.schoolId);
  return json(
    {
      success: result.success,
      simulated: result.simulated ?? false,
      connectionVerified,
      messageId: result.messageId,
      error: result.error,
    },
    { status: result.success ? 200 : 502 },
  );
});

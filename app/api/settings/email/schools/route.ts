import { withAuth, json } from "@/lib/apiHelpers";
import { isSuperAdmin, requireCondition } from "@/lib/authz";
import { getEmailConfig, saveSchoolSenderIdentity } from "@/lib/email-config-data";
import { listSchools } from "@/lib/schools-data";
import { emailService } from "@/lib/email-service";

/** List every school plus its own sender identity override, if it has one. */
export const GET = withAuth(async (_req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Seul l'administrateur du site peut voir les paramètres email.");

  const [allSchools, config] = await Promise.all([listSchools(), getEmailConfig()]);

  const schools = allSchools
    .map((s) => {
      const override = config?.schoolIdentities?.[s.id];
      return {
        schoolId: s.id,
        name: s.name,
        identity: override
          ? { fromName: override.fromName, fromEmail: override.fromEmail, replyTo: override.replyTo ?? "" }
          : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return json({ schools });
});

interface SaveBody {
  schoolId?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

/** Sets one school's "from" identity override. */
export const PUT = withAuth(async (req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Seul l'administrateur du site peut modifier les paramètres email.");
  const body: SaveBody = await req.json();

  if (!body.schoolId) {
    return json({ error: "Un schoolId est requis." }, { status: 400 });
  }
  if (!body.fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.fromEmail)) {
    return json({ error: "Une adresse email d'expédition valide est requise." }, { status: 400 });
  }
  if (!body.fromName?.trim()) {
    return json({ error: "Un nom d'expéditeur est requis." }, { status: 400 });
  }

  await saveSchoolSenderIdentity(body.schoolId, {
    fromName: body.fromName.trim(),
    fromEmail: body.fromEmail.trim(),
    replyTo: body.replyTo?.trim() || undefined,
  });
  emailService.clearCache();
  return json({ ok: true });
});

/** Clears one school's override — it goes back to using the global default. */
export const DELETE = withAuth(async (req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Seul l'administrateur du site peut modifier les paramètres email.");
  const body: { schoolId?: string } = await req.json();

  if (!body.schoolId) {
    return json({ error: "Un schoolId est requis." }, { status: 400 });
  }

  await saveSchoolSenderIdentity(body.schoolId, null);
  emailService.clearCache();
  return json({ ok: true });
});

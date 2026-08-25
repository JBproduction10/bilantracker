import { withAuth, json } from "@/lib/apiHelpers";
import * as users from "@/lib/users-data";
import * as schools from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { isSuperAdmin, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (_req, { params }, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can resend an invite.");
  const allUsers = await users.listUsers();
  const target = allUsers.find((u) => u.id === params.uid);
  const school = target?.schoolId ? await schools.getSchool(target.schoolId) : null;
  const result = await users.resendInvite(params.uid, school?.name);
  await logAudit({
    actor: user, action: "user.resend_invite", schoolId: target?.schoolId, schoolName: school?.name,
    targetType: "user", targetId: params.uid, targetLabel: target?.email,
    details: { simulated: result.simulated },
  });
  return json({ simulated: result.simulated });
});

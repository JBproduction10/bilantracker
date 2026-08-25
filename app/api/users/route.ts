import { withAuth, json } from "@/lib/apiHelpers";
import * as users from "@/lib/users-data";
import * as schools from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { isSuperAdmin, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (_req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can manage accounts.");
  const list = await users.listUsers();
  return json(list);
});

export const POST = withAuth(async (req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can create accounts.");
  const body = await req.json();
  const school = body.schoolId ? await schools.getSchool(body.schoolId) : null;
  const { user: created, invite } = await users.createUser(body, school?.name);
  await logAudit({
    actor: user, action: "user.create", schoolId: created.schoolId, schoolName: school?.name,
    targetType: "user", targetId: created.id, targetLabel: created.email,
    details: { role: created.role, simulated: invite.simulated },
  });
  return json({ ...created, _invite: { simulated: invite.simulated } }, { status: 201 });
});

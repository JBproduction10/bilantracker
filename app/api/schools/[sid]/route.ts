import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { isSuperAdmin, requireCondition } from "@/lib/authz";

export const PUT = withAuth(async (req, { params }, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can edit school details.");
  const body = await req.json();
  const school = await data.updateSchool(params.sid, body);
  await logAudit({
    actor: user, action: "school.update", schoolId: school.id, schoolName: school.name,
    targetType: "school", targetId: school.id, targetLabel: school.name,
  });
  return json(school);
});

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can remove a school.");
  const before = await data.getSchool(params.sid);
  await data.deleteSchool(params.sid);
  await logAudit({
    actor: user, action: "school.delete", schoolId: params.sid, schoolName: before?.name,
    targetType: "school", targetId: params.sid, targetLabel: before?.name,
  });
  return new Response(null, { status: 204 });
});

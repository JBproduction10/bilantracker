import { withAuth } from "@/lib/apiHelpers";
import * as users from "@/lib/users-data";
import { logAudit } from "@/lib/audit";
import { isSuperAdmin, requireCondition } from "@/lib/authz";

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can remove accounts.");
  const target = (await users.listUsers()).find((u) => u.id === params.uid);
  await users.removeUser(params.uid);
  await logAudit({
    actor: user, action: "user.remove", schoolId: target?.schoolId,
    targetType: "user", targetId: params.uid, targetLabel: target?.email,
    details: { role: target?.role },
  });
  return new Response(null, { status: 204 });
});

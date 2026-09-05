import { withAuth, json } from "@/lib/apiHelpers";
import { listAuditLogs } from "@/lib/audit";
import { requireCondition } from "@/lib/authz";
import { getVisibleSchoolIds } from "@/lib/schools-data";

export const GET = withAuth(async (req, _ctx, user) => {
  // Audit trail visibility is deliberately narrower than the general
  // "can view every school" permission: only super_admin and promoter get
  // it at all — school_admin, treasury, and everyone else lose access
  // entirely, even to their own school's entries.
  requireCondition(user.role === "super_admin" || user.role === "promoter", "You don't have access to the audit log.");

  const requestedSchoolId = new URL(req.url).searchParams.get("schoolId") || undefined;

  // A promoter oversees its own network but isn't above the super_admin —
  // they shouldn't be able to see what a super_admin did, and they never
  // see another promoter's schools. Super_admin has no such blind spot.
  const excludeActorRoles = user.role === "promoter" ? ["super_admin"] : undefined;
  const visibleSchoolIds = await getVisibleSchoolIds(user);

  if (requestedSchoolId && visibleSchoolIds && !visibleSchoolIds.includes(requestedSchoolId)) {
    return json([]);
  }

  const logs = await listAuditLogs({
    schoolId: requestedSchoolId,
    schoolIds: !requestedSchoolId ? visibleSchoolIds : undefined,
    excludeActorRoles,
  });
  return json(logs);
});

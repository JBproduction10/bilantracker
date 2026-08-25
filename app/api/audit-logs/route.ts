import { withAuth, json } from "@/lib/apiHelpers";
import { listAuditLogs } from "@/lib/audit";
import { canViewAllSchools, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (req, _ctx, user) => {
  const requestedSchoolId = new URL(req.url).searchParams.get("schoolId") || undefined;

  let schoolId: string | undefined;
  if (canViewAllSchools(user)) {
    // Super admin and promoter may see every school, or filter to one.
    schoolId = requestedSchoolId;
  } else if (user.role === "school_admin") {
    // Forced to their own school regardless of what the query string says.
    schoolId = user.schoolId;
  } else {
    requireCondition(false, "You don't have access to the audit log.");
  }

  const logs = await listAuditLogs({ schoolId });
  return json(logs);
});

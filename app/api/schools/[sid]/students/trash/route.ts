import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canManageStudents, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageStudents(user, params.sid));
  const trashed = await data.listTrashedStudents(params.sid);
  return json(trashed);
});

import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canReadSchool, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (_req, { params }, user) => {
  requireCondition(canReadSchool(user, params.sid));
  const ledger = await data.getStudentLedger(params.sid, params.stid);
  return json(ledger);
});

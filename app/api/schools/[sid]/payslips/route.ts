import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canViewPayslips, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (req, { params }, user) => {
  requireCondition(canViewPayslips(user, params.sid));
  const period = new URL(req.url).searchParams.get("period") || "";
  const payslips = await data.listPayslips(params.sid, period);
  return json(payslips);
});

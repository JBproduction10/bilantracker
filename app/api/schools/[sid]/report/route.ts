import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canReadSchool, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (req, { params }, user) => {
  requireCondition(await canReadSchool(user, params.sid));
  const period = new URL(req.url).searchParams.get("period") || "all";
  const report = await data.getSchoolReport(params.sid, period);
  return json(report);
});

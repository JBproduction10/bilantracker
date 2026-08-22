import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canViewAllSchools, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (req, _ctx, user) => {
  requireCondition(canViewAllSchools(user), "Only the site admin and the promoter can see the consolidated report.");
  const period = new URL(req.url).searchParams.get("period") || "all";
  const reports = await data.getAllReports(period);
  return json(reports);
});

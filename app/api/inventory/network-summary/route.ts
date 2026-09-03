import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canViewAllSchools, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (req, _ctx, user) => {
  requireCondition(canViewAllSchools(user), "Only the site admin and the promoter can see the network-wide stock overview.");
  const period = new URL(req.url).searchParams.get("period") || "all";
  const overview = await data.getNetworkInventoryOverview(period);
  return json(overview);
});

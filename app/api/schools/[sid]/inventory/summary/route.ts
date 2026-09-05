import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canViewInventory, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (req, { params }, user) => {
  requireCondition(await canViewInventory(user, params.sid));
  const period = new URL(req.url).searchParams.get("period") || "all";
  const summary = await data.getInventorySummary(params.sid, period);
  return json(summary);
});

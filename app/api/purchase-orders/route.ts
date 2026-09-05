import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canViewAllSchools, requireCondition } from "@/lib/authz";
import type { PurchaseOrderStatus } from "@/lib/types";

export const GET = withAuth(async (req, _ctx, user) => {
  requireCondition(canViewAllSchools(user), "Only Bonté Service, the promoter, and the site admin see the network-wide queue.");
  const status = new URL(req.url).searchParams.get("status") as PurchaseOrderStatus | null;
  const schoolIds = await data.getVisibleSchoolIds(user);
  const orders = await data.listAllPurchaseOrders(status || undefined, schoolIds);
  return json(orders);
});

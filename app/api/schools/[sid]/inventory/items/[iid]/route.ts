import { withAuth } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageInventory, requireCondition } from "@/lib/authz";

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageInventory(user, params.sid));
  const items = await data.listInventoryItems(params.sid);
  const removed = items.find((i) => i.id === params.iid);
  await data.removeInventoryItem(params.sid, params.iid);
  await logAudit({
    actor: user, action: "inventory_item.remove", schoolId: params.sid,
    targetType: "inventory_item", targetId: params.iid, targetLabel: removed?.name,
  });
  return new Response(null, { status: 204 });
});

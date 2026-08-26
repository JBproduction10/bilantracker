import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canViewInventory, canManageInventory, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (_req, { params }, user) => {
  requireCondition(canViewInventory(user, params.sid));
  const items = await data.listInventoryItems(params.sid);
  return json(items);
});

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageInventory(user, params.sid));
  const body = await req.json();
  const item = await data.addInventoryItem(params.sid, body);
  await logAudit({
    actor: user, action: "inventory_item.add", schoolId: params.sid,
    targetType: "inventory_item", targetId: item.id, targetLabel: item.name,
    details: { category: item.category, unitPrice: item.unitPrice, quantityOnHand: item.quantityOnHand },
  });
  return json(item, { status: 201 });
});

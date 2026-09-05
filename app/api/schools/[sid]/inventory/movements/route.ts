import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canViewInventory, canManageInventory, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (req, { params }, user) => {
  requireCondition(await canViewInventory(user, params.sid));
  const period = new URL(req.url).searchParams.get("period") || undefined;
  const movements = await data.listStockMovements(params.sid, period);
  return json(movements);
});

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageInventory(user, params.sid));
  const body = await req.json();
  const movement = await data.addStockMovement(params.sid, body, user.name || user.email || undefined);
  await logAudit({
    actor: user, action: "stock_movement.add", schoolId: params.sid,
    targetType: "stock_movement", targetId: movement.id, targetLabel: movement.itemName,
    details: { type: movement.type, quantity: movement.quantity, amount: movement.amount },
  });
  return json(movement, { status: 201 });
});

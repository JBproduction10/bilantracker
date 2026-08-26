import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canViewPurchaseOrders, canSubmitPurchaseOrder, requireCondition } from "@/lib/authz";
import type { PurchaseOrderStatus } from "@/lib/types";

export const GET = withAuth(async (req, { params }, user) => {
  requireCondition(canViewPurchaseOrders(user, params.sid));
  const status = new URL(req.url).searchParams.get("status") as PurchaseOrderStatus | null;
  const orders = await data.listPurchaseOrders(params.sid, status || undefined);
  return json(orders);
});

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canSubmitPurchaseOrder(user, params.sid), "Only the school's own admin can submit a purchase order request.");
  const body = await req.json();
  const order = await data.addPurchaseOrder(params.sid, body, user.name || user.email || undefined);
  await logAudit({
    actor: user, action: "purchase_order.submit", schoolId: params.sid, schoolName: order.schoolName,
    targetType: "purchase_order", targetId: order.id, targetLabel: order.label,
    details: { category: order.category, amount: order.amountRequested, period: order.period },
  });
  return json(order, { status: 201 });
});

import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notifications-data";
import { listUserIdsByRole } from "@/lib/users-data";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/constants";
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

  // Best-effort: let Bonté Service and the site admin know a new purchase
  // order needs a decision. Never let a notification hiccup fail the
  // submission itself.
  try {
    const decidingIds = await listUserIdsByRole(["treasury", "super_admin"]);
    await notifyUsers(decidingIds, {
      schoolId: params.sid,
      type: "purchase_order.submitted",
      title: "Nouveau bon de commande",
      message: `${order.schoolName} a soumis un bon de commande (${EXPENSE_CATEGORY_LABELS[order.category]}) de ${order.amountRequested} pour "${order.label}".`,
      link: "/purchase-orders",
    });
  } catch (notifyErr) {
    console.error("Failed to notify of new purchase order:", notifyErr);
  }

  return json(order, { status: 201 });
});

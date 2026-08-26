import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canDecidePurchaseOrder, requireCondition } from "@/lib/authz";
import type { AuditAction } from "@/lib/types";

export const PATCH = withAuth(async (req, { params }, user) => {
  requireCondition(canDecidePurchaseOrder(user), "Only Bonté Service and the site admin can decide on a purchase order.");
  const body = await req.json();
  const order = await data.decidePurchaseOrder(params.sid, params.poid, body, user.name || user.email || undefined);
  const action: AuditAction =
    body.action === "validate" ? "purchase_order.validate"
    : body.action === "reject" ? "purchase_order.reject"
    : "purchase_order.execute";
  await logAudit({
    actor: user, action, schoolId: params.sid, schoolName: order.schoolName,
    targetType: "purchase_order", targetId: order.id, targetLabel: order.label,
    details: { status: order.status, executedAmount: order.executedAmount },
  });
  return json(order);
});

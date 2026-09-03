import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notifications-data";
import { listUserIdsByRole } from "@/lib/users-data";
import { canDecidePurchaseOrder, requireCondition } from "@/lib/authz";
import type { AuditAction } from "@/lib/types";

const DECISION_LABEL: Record<string, string> = {
  validated: "validé",
  rejected: "rejeté",
  executed: "exécuté",
};

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

  // Best-effort: let the school's own admin know their request moved.
  try {
    const schoolAdminIds = await listUserIdsByRole(["school_admin"], params.sid);
    await notifyUsers(schoolAdminIds, {
      schoolId: params.sid,
      type: "purchase_order.decided",
      title: "Bon de commande mis à jour",
      message: `Votre bon de commande "${order.label}" a été ${DECISION_LABEL[order.status] ?? order.status}.`,
      link: "/purchase-orders",
    });
  } catch (notifyErr) {
    console.error("Failed to notify school of purchase order decision:", notifyErr);
  }

  return json(order);
});

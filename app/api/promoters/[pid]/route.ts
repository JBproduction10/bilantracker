import { withAuth, json } from "@/lib/apiHelpers";
import * as promoters from "@/lib/promoters-data";
import { logAudit } from "@/lib/audit";
import { isSuperAdmin, requireCondition } from "@/lib/authz";

export const PUT = withAuth(async (req, { params }, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can edit a promoter.");
  const body = await req.json();
  const promoter = await promoters.updatePromoter(params.pid, body);
  await logAudit({
    actor: user, action: "promoter.update",
    targetType: "promoter", targetId: promoter.id, targetLabel: promoter.name,
    details: { hasTreasury: promoter.hasTreasury },
  });
  return json(promoter);
});

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can remove a promoter.");
  const before = await promoters.getPromoter(params.pid);
  await promoters.deletePromoter(params.pid);
  await logAudit({
    actor: user, action: "promoter.delete",
    targetType: "promoter", targetId: params.pid, targetLabel: before?.name,
  });
  return new Response(null, { status: 204 });
});

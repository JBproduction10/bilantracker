import { withAuth, json } from "@/lib/apiHelpers";
import * as promoters from "@/lib/promoters-data";
import * as schools from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { isSuperAdmin, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (_req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin manages promoters.");
  const [list, allSchools] = await Promise.all([promoters.listPromoters(), schools.listSchools()]);
  const withSchools = list.map((p) => ({
    ...p,
    schools: allSchools.filter((s) => s.promoterId === p.id).map((s) => ({ id: s.id, name: s.name, color: s.color })),
  }));
  return json(withSchools);
});

export const POST = withAuth(async (req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can add a new promoter.");
  const body = await req.json();
  if (!body.name) return json({ error: "Give this promoter a name." }, { status: 400 });
  const promoter = await promoters.createPromoter(body);
  await logAudit({
    actor: user, action: "promoter.create",
    targetType: "promoter", targetId: promoter.id, targetLabel: promoter.name,
    details: { hasTreasury: promoter.hasTreasury },
  });
  return json(promoter, { status: 201 });
});

import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import type { FieldCategory } from "@/lib/types";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const PUT = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const body = await req.json();
  const field = await data.updateField(params.sid, params.category as FieldCategory, params.fid, body);
  await logAudit({
    actor: user, action: "field.update", schoolId: params.sid,
    targetType: "field", targetId: field.id, targetLabel: field.label,
    details: { category: params.category, type: field.type, value: field.value },
  });
  return json(field);
});

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const school = await data.getSchool(params.sid);
  const target = school?.fields[params.category as FieldCategory]?.find((f) => f.id === params.fid);
  await data.removeField(params.sid, params.category as FieldCategory, params.fid);
  await logAudit({
    actor: user, action: "field.remove", schoolId: params.sid,
    targetType: "field", targetId: params.fid, targetLabel: target?.label,
    details: { category: params.category },
  });
  return new Response(null, { status: 204 });
});

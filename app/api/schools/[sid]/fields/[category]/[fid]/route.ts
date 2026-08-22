import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import type { FieldCategory } from "@/lib/types";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const PUT = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const body = await req.json();
  const field = await data.updateField(params.sid, params.category as FieldCategory, params.fid, body);
  return json(field);
});

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  await data.removeField(params.sid, params.category as FieldCategory, params.fid);
  return new Response(null, { status: 204 });
});

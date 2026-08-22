import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import type { FieldCategory } from "@/lib/types";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const body = await req.json();
  const field = await data.addField(params.sid, params.category as FieldCategory, body);
  return json(field, { status: 201 });
});

import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { isSuperAdmin, requireCondition } from "@/lib/authz";

export const PUT = withAuth(async (req, { params }, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can edit school details.");
  const body = await req.json();
  const school = await data.updateSchool(params.sid, body);
  return json(school);
});

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can remove a school.");
  await data.deleteSchool(params.sid);
  return new Response(null, { status: 204 });
});

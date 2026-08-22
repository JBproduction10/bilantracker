import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canViewAllSchools, isSuperAdmin, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (_req, _ctx, user) => {
  const schools = await data.listSchools();
  if (canViewAllSchools(user)) return json(schools);
  // school_admin / finance / teacher only ever see their own school
  return json(schools.filter((s) => s.id === user.schoolId));
});

export const POST = withAuth(async (req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can add a new school.");
  const body = await req.json();
  if (!body.name || !body.domain) {
    return json({ error: "Give this school a name and email domain." }, { status: 400 });
  }
  const school = await data.createSchool(body);
  return json(school, { status: 201 });
});

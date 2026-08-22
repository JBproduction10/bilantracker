import { withAuth, json } from "@/lib/apiHelpers";
import * as users from "@/lib/users-data";
import { isSuperAdmin, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (_req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can manage accounts.");
  const list = await users.listUsers();
  return json(list);
});

export const POST = withAuth(async (req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can create accounts.");
  const body = await req.json();
  const created = await users.createUser(body);
  return json(created, { status: 201 });
});

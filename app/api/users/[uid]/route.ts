import { withAuth } from "@/lib/apiHelpers";
import * as users from "@/lib/users-data";
import { isSuperAdmin, requireCondition } from "@/lib/authz";

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can remove accounts.");
  await users.removeUser(params.uid);
  return new Response(null, { status: 204 });
});

import { withAuth, json } from "@/lib/apiHelpers";
import { listNotifications } from "@/lib/notifications-data";

/** Any signed-in account can read its own notifications — never anyone else's. */
export const GET = withAuth(async (_req, _ctx, user) => {
  const result = await listNotifications(user.id);
  return json(result);
});

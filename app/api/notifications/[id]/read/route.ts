import { withAuth, json } from "@/lib/apiHelpers";
import { markNotificationRead } from "@/lib/notifications-data";

export const PATCH = withAuth(async (_req, { params }, user) => {
  // Scoped to user.id inside markNotificationRead — nobody can mark
  // another account's notification read this way.
  await markNotificationRead(user.id, params.id);
  return json({ ok: true });
});

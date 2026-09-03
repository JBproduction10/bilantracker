import { withAuth, json } from "@/lib/apiHelpers";
import { markAllNotificationsRead } from "@/lib/notifications-data";

export const POST = withAuth(async (_req, _ctx, user) => {
  await markAllNotificationsRead(user.id);
  return json({ ok: true });
});

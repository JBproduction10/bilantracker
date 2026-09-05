import { getDb } from "./mongodb";
import { uid } from "./uid";
import { sendNotificationEmail } from "./mailer";
import type { Notification, NotificationType } from "./types";

async function collection() {
  const db = await getDb();
  return db.collection<Notification>("notifications");
}

export interface NotifyInput {
  schoolId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  /**
   * Skip the mirrored email for this call — used only when the caller is
   * already sending a purpose-built email of its own (e.g. the account
   * invite email), so the recipient isn't emailed twice for one event.
   */
  skipEmail?: boolean;
}

/**
 * Fans a single event out to every recipient in `userIds` — one row each,
 * so read state is per-account (see the `Notification` type docs). Silently
 * skipped if `userIds` is empty; a missed notification should never block
 * the action that triggered it, so callers are expected to fire this and
 * not let a failure here bubble up. Duplicate ids are collapsed so nobody
 * gets the same notification twice.
 *
 * Also emails every recipient the same title/message (best-effort, gated
 * by the "inApp" toggle in Settings → Email) — an in-app-only notification
 * is invisible to anyone who isn't already logged in and looking at the
 * bell icon, which defeats the point for anything time-sensitive like a
 * purchase order or a payroll waiting to be sent.
 */
export async function notifyUsers(userIds: string[], input: NotifyInput): Promise<void> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return;
  const col = await collection();
  const at = Date.now();
  await col.insertMany(
    unique.map((userId) => ({
      id: uid("ntf"),
      userId,
      schoolId: input.schoolId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      read: false,
      createdAt: at,
    })),
  );

  if (input.skipEmail) return;
  try {
    const db = await getDb();
    const recipients = await db
      .collection<{ id: string; email: string; name: string }>("users")
      .find({ id: { $in: unique } }, { projection: { _id: 0, id: 1, email: 1, name: 1 } })
      .toArray();
    await Promise.all(
      recipients
        .filter((r) => r.email)
        .map((r) =>
          sendNotificationEmail({
            to: r.email,
            name: r.name,
            title: input.title,
            message: input.message,
            link: input.link,
            schoolId: input.schoolId,
          }).catch((err) => console.error(`Failed to email notification to ${r.email}:`, err)),
        ),
    );
  } catch (err) {
    // Never let an email hiccup take down the in-app notification that
    // already succeeded above.
    console.error("Failed to send notification emails:", err);
  }
}

export interface ListNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
}

/** Most recent notifications for one account, newest first, plus how many are unread. */
export async function listNotifications(userId: string, limit = 30): Promise<ListNotificationsResult> {
  const col = await collection();
  const [rows, unreadCount] = await Promise.all([
    col
      .find({ userId }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 100))
      .toArray(),
    col.countDocuments({ userId, read: false }),
  ]);
  return { notifications: rows, unreadCount };
}

/** Marks one notification read — scoped to the requesting user so nobody can mark another account's. */
export async function markNotificationRead(userId: string, id: string): Promise<void> {
  const col = await collection();
  await col.updateOne({ id, userId }, { $set: { read: true } });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const col = await collection();
  await col.updateMany({ userId, read: false }, { $set: { read: true } });
}

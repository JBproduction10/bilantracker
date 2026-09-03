import { getDb } from "./mongodb";
import { uid } from "./uid";
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
}

/**
 * Fans a single event out to every recipient in `userIds` — one row each,
 * so read state is per-account (see the `Notification` type docs). Silently
 * skipped if `userIds` is empty; a missed notification should never block
 * the action that triggered it, so callers are expected to fire this and
 * not let a failure here bubble up. Duplicate ids are collapsed so nobody
 * gets the same notification twice.
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

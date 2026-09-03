"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import type { Notification } from "@/lib/types";

const POLL_INTERVAL_MS = 30_000;

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const loadedOnce = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data: { notifications: Notification[]; unreadCount: number } = await res.json();
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silent — the bell just keeps showing whatever it last had. A toast
      // here would be noisy on a background poll that most people won't notice.
    } finally {
      setLoading(false);
      loadedOnce.current = true;
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && !loadedOnce.current) await load();
  }

  async function handleItemClick(notification: Notification) {
    if (!notification.read) {
      setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/notifications/${notification.id}/read`, { method: "PATCH" }).catch(() => {});
    }
    setOpen(false);
    if (notification.link) router.push(notification.link);
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
    } catch {
      // Best-effort — a failed mark-all-read isn't worth surfacing an error for.
    }
  }

  function timeAgo(ms: number): string {
    const diffMs = Date.now() - ms;
    if (diffMs < 60_000) return "À l'instant";
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days} j`;
  }

  return (
    <div className="notif-bell-wrap" ref={wrapRef}>
      <button className="notif-bell-btn" onClick={handleToggle} aria-label="Notifications">
        <Bell size={19} />
        {unreadCount > 0 && <span className="notif-bell-dot" />}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <span className="notif-panel-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={handleMarkAllRead}>
                <CheckCheck size={13} />
                Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="notif-list">
            {loading ? (
              <div className="notif-loading">
                <Loader2 size={16} className="spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="notif-empty">Rien de nouveau.</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  className={`notif-item${n.read ? "" : " unread"}`}
                  onClick={() => handleItemClick(n)}
                >
                  <div className="notif-item-head">
                    {!n.read && <span className="notif-dot" />}
                    <span className="notif-item-title">{n.title}</span>
                  </div>
                  <span className="notif-item-msg">{n.message}</span>
                  <span className="notif-item-time">{timeAgo(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

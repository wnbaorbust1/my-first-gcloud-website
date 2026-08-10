"use client";

import { Heart, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
}

/**
 * Real, unread `Notification` rows — today, the only writer is
 * "Send Encouragement" (spec Prompt 11 FACILITATOR ACTIONS). Renders
 * nothing when there's nothing unread, matching this app's "never a
 * fake/empty widget" convention rather than always reserving space.
 */
export function NotificationsCard({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  if (notifications.length === 0) return null;

  async function dismiss(id: string) {
    setDismissing((s) => new Set(s).add(id));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-50 p-4"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700">
            <Heart className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy-900">{n.title}</p>
            {n.body && <p className="mt-0.5 text-sm text-navy-700">{n.body}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismiss(n.id)}
            disabled={dismissing.has(n.id)}
            aria-label="Dismiss"
            className="shrink-0 rounded p-1 text-navy-400 transition-colors hover:text-navy-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

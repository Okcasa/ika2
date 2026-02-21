'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  getStoredNotifications,
  notificationChangeEventName,
  storeNotifications,
} from '@/lib/notifications';
import type { AppNotification } from '@/lib/notifications';
import { cn } from '@/lib/utils';

type NotificationBellProps = {
  buttonClassName?: string;
  popoverClassName?: string;
};

export function NotificationBell({
  buttonClassName,
  popoverClassName,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const syncNotifications = useCallback(() => {
    setNotifications(getStoredNotifications());
  }, []);

  useEffect(() => {
    syncNotifications();
    window.addEventListener(notificationChangeEventName, syncNotifications);
    window.addEventListener('storage', syncNotifications);
    return () => {
      window.removeEventListener(notificationChangeEventName, syncNotifications);
      window.removeEventListener('storage', syncNotifications);
    };
  }, [syncNotifications]);

  const unreadCount = useMemo(
    () => notifications.reduce((acc, item) => acc + (item.read ? 0 : 1), 0),
    [notifications]
  );

  const markAllRead = () => {
    if (notifications.length === 0 || unreadCount === 0) return;
    const next = notifications.map((item) => ({ ...item, read: true }));
    setNotifications(next);
    storeNotifications(next);
  };

  const markOneRead = (id: string) => {
    const next = notifications.map((item) => (item.id === id ? { ...item, read: true } : item));
    setNotifications(next);
    storeNotifications(next);
  };

  const deleteOne = (id: string) => {
    const next = notifications.filter((item) => item.id !== id);
    setNotifications(next);
    storeNotifications(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            'relative rounded-full h-12 w-12 bg-white shadow-sm hover:bg-stone-50',
            buttonClassName
          )}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-stone-600" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className={cn(
          'w-80 rounded-2xl border border-stone-200 bg-[#F5F5F4] text-stone-900 p-0 overflow-hidden shadow-lg',
          popoverClassName
        )}
      >
        <div className="border-b border-stone-100 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-stone-900">Notifications</div>
            <div className="text-xs text-stone-500">Team activity and lead updates</div>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-semibold text-stone-700 hover:text-stone-900"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-2">
          {notifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-[#F5F5F4] px-3 py-4 text-center text-xs text-stone-500">
              No notifications yet.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'rounded-xl border px-3 py-2.5',
                  item.read ? 'border-stone-100 bg-white' : 'border-blue-100 bg-blue-50/40'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-medium text-stone-800 leading-snug">{item.text}</div>
                  <button
                    type="button"
                    onClick={() => deleteOne(item.id)}
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-[11px] text-stone-400">
                    {formatDistanceToNow(item.at, { addSuffix: true })}
                  </div>
                  {!item.read && (
                    <button
                      type="button"
                      onClick={() => markOneRead(item.id)}
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-800"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

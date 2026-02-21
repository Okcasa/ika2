export type AppNotification = {
  id: string;
  text: string;
  at: number;
  read: boolean;
};

const STORAGE_KEY = 'ika_notifications';
const CHANGE_EVENT = 'ika:notifications-changed';

const sanitize = (items: AppNotification[]): AppNotification[] =>
  (items || [])
    .filter((item) => item && typeof item.id === 'string')
    .map((item) => ({
      id: String(item.id),
      text: String(item.text || ''),
      at: Number(item.at) || Date.now(),
      read: Boolean(item.read),
    }))
    .slice(0, 100);

export const getStoredNotifications = (): AppNotification[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sanitize(parsed as AppNotification[]);
  } catch {
    return [];
  }
};

export const getUnreadNotificationCount = (): number =>
  getStoredNotifications().reduce((acc, item) => acc + (item.read ? 0 : 1), 0);

export const storeNotifications = (items: AppNotification[]) => {
  if (typeof window === 'undefined') return;
  const next = sanitize(items);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, {
      detail: {
        unreadCount: next.reduce((acc, item) => acc + (item.read ? 0 : 1), 0),
      },
    })
  );
};

export const notificationChangeEventName = CHANGE_EVENT;

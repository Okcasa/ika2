export type AppNotification = {
  id: string;
  kind?: 'payment' | 'info';
  title?: string;
  text: string;
  leads?: number;
  amount?: number;
  currency?: string;
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
      kind:
        item.kind === 'payment' || item.kind === 'info'
          ? item.kind
          : 'info',
      title: item.title ? String(item.title) : undefined,
      text: String(item.text || ''),
      leads: Number.isFinite(Number(item.leads)) ? Number(item.leads) : undefined,
      amount: Number.isFinite(Number(item.amount)) ? Number(item.amount) : undefined,
      currency: item.currency ? String(item.currency).toUpperCase() : 'USD',
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

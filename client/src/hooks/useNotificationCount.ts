import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';

export function useNotificationCount(enabled: boolean) {
  const [notificationsUnread, setNotificationsUnread] = useState(0);

  const refreshNotifications = useCallback(async () => {
    if (!enabled) {
      setNotificationsUnread(0);
      return;
    }
    try {
      const data = await apiRequest<{ notificationsUnread: number }>('/api/inbox/summary');
      setNotificationsUnread(data.notificationsUnread);
    } catch {
      setNotificationsUnread(0);
    }
  }, [enabled]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshNotifications();
    });
  }, [refreshNotifications]);

  useEffect(() => {
    if (!enabled) return;
    const intervalId = window.setInterval(() => {
      void refreshNotifications();
    }, 60_000);
    const onFocus = () => {
      void refreshNotifications();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, refreshNotifications]);

  return { notificationsUnread, refreshNotifications };
}

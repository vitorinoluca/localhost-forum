import { useEffect, useState } from 'react';
import { apiRequest, type AuthUser } from '../../api';
import type { InboxNotification, Route } from '../../types';
import { Spinner } from '../common/Spinner';

export function NotificationsPage({
  user,
  navigate,
  onRefreshNotifications,
}: {
  user: AuthUser | null;
  navigate: (route: Route) => void;
  onRefreshNotifications: () => void;
}) {
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
    });
    void apiRequest<{ notifications: InboxNotification[] }>('/api/notifications')
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data.notifications) ? data.notifications : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function openItem(n: InboxNotification) {
    if (!n.readAt) {
      try {
        await apiRequest(`/api/notifications/${n.id}/read`, { method: 'POST' });
        setItems((prev) =>
          prev.map((row) =>
            row.id === n.id ? { ...row, readAt: new Date().toISOString() } : row,
          ),
        );
        onRefreshNotifications();
      } catch {
        return;
      }
    }
    navigate(n.linkPath as Route);
  }

  async function markAllRead() {
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
      setItems((prev) => prev.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })));
      onRefreshNotifications();
    } catch {
      return;
    }
  }

  if (!user) {
    return null;
  }

  return (
    <section className='mx-auto max-w-lg px-6 py-10'>
      <div className='mb-8 flex flex-wrap items-end justify-between gap-4'>
        <div>
          <p className='text-[10px] font-bold uppercase tracking-[0.25em] text-[#3b82f6]'>
            Actividad
          </p>
          <h1 className='font-["Outfit"] text-2xl font-bold uppercase tracking-tight text-white'>
            Notificaciones
          </h1>
        </div>
        {items.some((n) => !n.readAt) ? (
          <button
            className='text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition hover:text-white'
            type='button'
            onClick={() => void markAllRead()}
          >
            Marcar todo leído
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className='flex justify-center py-16'>
          <Spinner label='Cargando' size='md' />
        </div>
      ) : items.length === 0 ? (
        <p className='text-center text-xs text-neutral-600'>No tenés notificaciones.</p>
      ) : (
        <ul className='space-y-2'>
          {items.map((n) => (
            <li key={n.id}>
              <button
                className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                  n.readAt
                    ? 'border-white/[0.06] bg-[#0c0c0f]/80'
                    : 'border-[#3b82f6]/25 bg-[#3b82f6]/5'
                }`}
                type='button'
                onClick={() => void openItem(n)}
              >
                <p className='text-[10px] font-bold uppercase tracking-widest text-neutral-500'>
                  {new Date(n.createdAt).toLocaleString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className='mt-1 text-sm font-semibold text-white'>{n.title}</p>
                {n.body ? <p className='mt-1 text-xs text-neutral-400'>{n.body}</p> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

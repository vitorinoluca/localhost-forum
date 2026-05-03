import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../../api';
import type { Route } from '../../types';
import { Spinner } from '../common/Spinner';

type AdminStats = {
  usersTotal: number;
  postsTotal: number;
};

type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
};

type RecentPostRow = {
  id: string;
  title: string;
  body_preview: string;
  created_at: string;
  author_name: string;
  author_email: string;
};

export function AdminDashboard({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [posts, setPosts] = useState<RecentPostRow[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const usersFirstLoad = useRef(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await apiRequest<AdminStats>('/api/admin/stats');
      setStats(data);
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'No se pudieron cargar las estadísticas.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const data = await apiRequest<{ posts: RecentPostRow[] }>('/api/admin/posts/recent?limit=40');
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'No se pudieron cargar las publicaciones.');
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadStats();
      void loadPosts();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadPosts, loadStats]);

  const refreshUsersList = useCallback(async () => {
    setUsersLoading(true);
    try {
      const q = new URLSearchParams();
      if (userQuery.trim()) q.set('q', userQuery.trim());
      const path = `/api/admin/users${q.toString() ? `?${q}` : ''}`;
      const data = await apiRequest<{ users: AdminUserRow[] }>(path);
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'No se pudo cargar la lista de usuarios.');
    } finally {
      setUsersLoading(false);
    }
  }, [userQuery]);

  useEffect(() => {
    let cancelled = false;
    const delayMs = usersFirstLoad.current ? 0 : 300;
    usersFirstLoad.current = false;
    const t = window.setTimeout(() => {
      void (async () => {
        setUsersLoading(true);
        try {
          const q = new URLSearchParams();
          if (userQuery.trim()) q.set('q', userQuery.trim());
          const path = `/api/admin/users${q.toString() ? `?${q}` : ''}`;
          const data = await apiRequest<{ users: AdminUserRow[] }>(path);
          if (!cancelled) setUsers(Array.isArray(data.users) ? data.users : []);
        } catch (e) {
          if (!cancelled) {
            setMessage(e instanceof ApiError ? e.message : 'No se pudo cargar la lista de usuarios.');
          }
        } finally {
          if (!cancelled) setUsersLoading(false);
        }
      })();
    }, delayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [userQuery]);

  async function banUser(userId: string) {
    setMessage('');
    try {
      await apiRequest(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ reason: banReason.trim() || undefined }),
      });
      setBanReason('');
      await refreshUsersList();
      await loadStats();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'No se pudo suspender al usuario.');
    }
  }

  async function unbanUser(userId: string) {
    setMessage('');
    try {
      await apiRequest(`/api/admin/users/${userId}/unban`, { method: 'POST' });
      await refreshUsersList();
      await loadStats();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'No se pudo levantar la suspensión.');
    }
  }

  async function deletePost(postId: string) {
    if (!window.confirm('¿Eliminar esta publicación de forma permanente?')) return;
    setMessage('');
    try {
      await apiRequest(`/api/admin/posts/${postId}`, { method: 'DELETE' });
      await loadPosts();
      await loadStats();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'No se pudo eliminar la publicación.');
    }
  }

  return (
    <div className='mx-auto max-w-7xl px-6 py-10'>
      <div className='mb-10 flex flex-wrap items-end justify-between gap-4'>
        <div>
          <p className='text-[10px] font-bold uppercase tracking-[0.25em] text-[#3b82f6]'>
            Superadmin
          </p>
          <h1 className='mt-1 font-["Outfit"] text-2xl font-bold uppercase tracking-tight text-white'>
            Panel de control
          </h1>
          <p className='mt-2 max-w-xl text-xs text-neutral-500'>
            Usuarios y moderación de contenido.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <button
            className='border border-white/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-300 transition hover:border-white/30 hover:text-white'
            type='button'
            onClick={() => {
              void loadStats();
              void refreshUsersList();
              void loadPosts();
            }}
          >
            Actualizar todo
          </button>
          <button
            className='border border-white/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-300 transition hover:border-white/30 hover:text-white'
            type='button'
            onClick={() => onNavigate('/')}
          >
            Volver al foro
          </button>
        </div>
      </div>

      {message ? (
        <p className='mb-6 rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200'>
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className='flex min-h-[180px] items-center justify-center py-12'>
          <Spinner label='Cargando estadísticas' size='lg' />
        </div>
      ) : stats ? (
        <section className='mb-12 grid gap-4 sm:grid-cols-2'>
          <div className='rounded-sm border border-white/10 bg-[#0f0f12] p-5'>
            <p className='text-[9px] font-bold uppercase tracking-widest text-neutral-600'>
              Usuarios
            </p>
            <p className='mt-2 font-["Outfit"] text-3xl font-bold text-white'>{stats.usersTotal}</p>
          </div>
          <div className='rounded-sm border border-white/10 bg-[#0f0f12] p-5'>
            <p className='text-[9px] font-bold uppercase tracking-widest text-neutral-600'>
              Publicaciones
            </p>
            <p className='mt-2 font-["Outfit"] text-3xl font-bold text-white'>{stats.postsTotal}</p>
          </div>
        </section>
      ) : null}

      <section className='mb-12'>
        <h2 className='mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400'>
          Usuarios
        </h2>
        <div className='mb-4 flex flex-wrap gap-3'>
          <input
            className='min-w-[200px] flex-1 border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-[#3b82f6]/50'
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder='Buscar por email o nombre'
            type='search'
            value={userQuery}
          />
          <input
            className='min-w-[180px] flex-1 border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-[#3b82f6]/50'
            onChange={(e) => setBanReason(e.target.value)}
            placeholder='Motivo de suspensión (opcional)'
            type='text'
            value={banReason}
          />
        </div>
        <div className='overflow-x-auto rounded-sm border border-white/10'>
          <table className='w-full min-w-[640px] text-left text-xs'>
            <thead className='border-b border-white/10 bg-black/40 text-[9px] font-bold uppercase tracking-widest text-neutral-500'>
              <tr>
                <th className='px-4 py-3'>Usuario</th>
                <th className='px-4 py-3'>Email</th>
                <th className='px-4 py-3'>Rol</th>
                <th className='px-4 py-3'>Estado</th>
                <th className='px-4 py-3 text-right'>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td className='px-4 py-12' colSpan={5}>
                    <div className='flex justify-center'>
                      <Spinner label='Cargando usuarios' size='sm' />
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className='px-4 py-8 text-neutral-500' colSpan={5}>
                    No hay resultados.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const banned = Boolean(u.banned_at);
                  return (
                    <tr key={u.id} className='border-b border-white/5'>
                      <td className='px-4 py-3 text-neutral-200'>{u.name}</td>
                      <td className='px-4 py-3 text-neutral-400'>{u.email}</td>
                      <td className='px-4 py-3 text-neutral-500'>{u.role}</td>
                      <td className='px-4 py-3'>
                        {banned ? (
                          <span className='text-red-400'>
                            Suspendido
                            {u.ban_reason ? ` — ${u.ban_reason}` : ''}
                          </span>
                        ) : (
                          <span className='text-emerald-500/90'>Activo</span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-right'>
                        {u.role === 'superadmin' ? (
                          <span className='text-[10px] text-neutral-600'>—</span>
                        ) : banned ? (
                          <button
                            className='text-[10px] font-bold uppercase tracking-widest text-emerald-400 transition hover:text-emerald-300'
                            type='button'
                            onClick={() => void unbanUser(u.id)}
                          >
                            Reactivar
                          </button>
                        ) : (
                          <button
                            className='text-[10px] font-bold uppercase tracking-widest text-red-400 transition hover:text-red-300'
                            type='button'
                            onClick={() => void banUser(u.id)}
                          >
                            Suspender
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className='mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400'>
          Publicaciones recientes
        </h2>
        <div className='overflow-x-auto rounded-sm border border-white/10'>
          <table className='w-full min-w-[720px] text-left text-xs'>
            <thead className='border-b border-white/10 bg-black/40 text-[9px] font-bold uppercase tracking-widest text-neutral-500'>
              <tr>
                <th className='px-4 py-3'>Título</th>
                <th className='px-4 py-3'>Autor</th>
                <th className='px-4 py-3'>Fecha</th>
                <th className='px-4 py-3 text-right'>Moderar</th>
              </tr>
            </thead>
            <tbody>
              {postsLoading ? (
                <tr>
                  <td className='px-4 py-12' colSpan={4}>
                    <div className='flex justify-center'>
                      <Spinner label='Cargando publicaciones' size='sm' />
                    </div>
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td className='px-4 py-8 text-neutral-500' colSpan={4}>
                    No hay publicaciones.
                  </td>
                </tr>
              ) : (
                posts.map((p) => (
                  <tr key={p.id} className='border-b border-white/5'>
                    <td className='max-w-[280px] px-4 py-3'>
                      <p className='truncate font-medium text-neutral-200'>{p.title}</p>
                      <p className='mt-1 line-clamp-2 text-[10px] text-neutral-600'>
                        {p.body_preview}
                      </p>
                    </td>
                    <td className='px-4 py-3 text-neutral-400'>
                      <span className='text-neutral-300'>{p.author_name}</span>
                      <br />
                      <span className='text-[10px] text-neutral-600'>{p.author_email}</span>
                    </td>
                    <td className='whitespace-nowrap px-4 py-3 text-neutral-500'>
                      {new Date(p.created_at).toLocaleString('es-AR')}
                    </td>
                    <td className='px-4 py-3 text-right'>
                      <button
                        className='text-[10px] font-bold uppercase tracking-widest text-red-400 transition hover:text-red-300'
                        type='button'
                        onClick={() => void deletePost(p.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

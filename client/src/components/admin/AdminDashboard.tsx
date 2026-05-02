import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../../api';
import type { Route } from '../../types';
import { Spinner } from '../common/Spinner';

type AdminStats = {
  usersTotal: number;
  postsTotal: number;
  visitsLast24h: number;
  visitsLast7d: number;
  topCountries: { country: string; count: number }[];
  recentVisits: Array<{
    path: string;
    countryCode: string | null;
    region: string | null;
    city: string | null;
    createdAt: string;
    userId: string | null;
  }>;
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

type IpBanRow = {
  id: string;
  cidr: string;
  reason: string | null;
  created_at: string;
  created_by_email: string | null;
};

type RecentPostRow = {
  id: string;
  title: string;
  body_preview: string;
  created_at: string;
  author_name: string;
  author_email: string;
};

const countryNameEs = new Intl.DisplayNames(['es'], { type: 'region' });

function formatCountry(code: string | null) {
  if (!code || code.length !== 2) return '—';
  try {
    return countryNameEs.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export function AdminDashboard({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [ipCidr, setIpCidr] = useState('');
  const [ipReason, setIpReason] = useState('');
  const [ipBans, setIpBans] = useState<IpBanRow[]>([]);
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

  const loadIpBans = useCallback(async () => {
    try {
      const data = await apiRequest<{ ipBans: IpBanRow[] }>('/api/admin/ip-bans');
      setIpBans(data.ipBans);
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'No se pudieron cargar los bloqueos IP.');
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const data = await apiRequest<{ posts: RecentPostRow[] }>('/api/admin/posts/recent?limit=40');
      setPosts(data.posts);
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'No se pudieron cargar las publicaciones.');
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadStats();
      void loadIpBans();
      void loadPosts();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadIpBans, loadPosts, loadStats]);

  const refreshUsersList = useCallback(async () => {
    setUsersLoading(true);
    try {
      const q = new URLSearchParams();
      if (userQuery.trim()) q.set('q', userQuery.trim());
      const path = `/api/admin/users${q.toString() ? `?${q}` : ''}`;
      const data = await apiRequest<{ users: AdminUserRow[] }>(path);
      setUsers(data.users);
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
          if (!cancelled) setUsers(data.users);
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

  async function addIpBan() {
    setMessage('');
    try {
      await apiRequest('/api/admin/ip-bans', {
        method: 'POST',
        body: JSON.stringify({
          cidr: ipCidr.trim(),
          reason: ipReason.trim() || undefined,
        }),
      });
      setIpCidr('');
      setIpReason('');
      await loadIpBans();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'No se pudo crear el bloqueo.');
    }
  }

  async function removeIpBan(id: string) {
    if (!window.confirm('¿Eliminar este bloqueo de IP?')) return;
    setMessage('');
    try {
      await apiRequest(`/api/admin/ip-bans/${id}`, { method: 'DELETE' });
      await loadIpBans();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'No se pudo eliminar el bloqueo.');
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
            Métricas de visitas (GeoIP local), usuarios, bloqueos por IP y moderación de contenido.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <button
            className='border border-white/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-300 transition hover:border-white/30 hover:text-white'
            type='button'
            onClick={() => {
              void loadStats();
              void refreshUsersList();
              void loadIpBans();
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
          <Spinner label='Cargando métricas' size='lg' />
        </div>
      ) : stats ? (
        <section className='mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
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
          <div className='rounded-sm border border-white/10 bg-[#0f0f12] p-5'>
            <p className='text-[9px] font-bold uppercase tracking-widest text-neutral-600'>
              Visitas (24 h)
            </p>
            <p className='mt-2 font-["Outfit"] text-3xl font-bold text-white'>
              {stats.visitsLast24h}
            </p>
          </div>
          <div className='rounded-sm border border-white/10 bg-[#0f0f12] p-5'>
            <p className='text-[9px] font-bold uppercase tracking-widest text-neutral-600'>
              Visitas (7 días)
            </p>
            <p className='mt-2 font-["Outfit"] text-3xl font-bold text-white'>{stats.visitsLast7d}</p>
          </div>
        </section>
      ) : null}

      {stats ? (
        <div className='mb-12 grid gap-10 lg:grid-cols-2'>
          <section>
            <h2 className='mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400'>
              Países (30 días, top 15)
            </h2>
            <div className='overflow-hidden rounded-sm border border-white/10'>
              <table className='w-full text-left text-xs'>
                <thead className='border-b border-white/10 bg-black/40 text-[9px] font-bold uppercase tracking-widest text-neutral-500'>
                  <tr>
                    <th className='px-4 py-3'>País</th>
                    <th className='px-4 py-3 text-right'>Visitas</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topCountries.length === 0 ? (
                    <tr>
                      <td className='px-4 py-6 text-neutral-500' colSpan={2}>
                        Aún no hay datos de país (necesitás tráfico con IPs públicas).
                      </td>
                    </tr>
                  ) : (
                    stats.topCountries.map((row) => (
                      <tr key={row.country} className='border-b border-white/5'>
                        <td className='px-4 py-2.5 text-neutral-200'>
                          {formatCountry(row.country)}
                          <span className='ml-2 text-[10px] text-neutral-600'>({row.country})</span>
                        </td>
                        <td className='px-4 py-2.5 text-right tabular-nums text-neutral-300'>
                          {row.count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className='mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400'>
              Visitas recientes
            </h2>
            <div className='max-h-[320px] overflow-auto rounded-sm border border-white/10'>
              <table className='w-full text-left text-[11px]'>
                <thead className='sticky top-0 border-b border-white/10 bg-black/90 text-[9px] font-bold uppercase tracking-widest text-neutral-500'>
                  <tr>
                    <th className='px-3 py-2'>Cuándo</th>
                    <th className='px-3 py-2'>Ubicación</th>
                    <th className='px-3 py-2'>Ruta</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentVisits.map((v, idx) => (
                    <tr key={`${v.createdAt}-${v.path}-${idx}`} className='border-b border-white/5'>
                      <td className='whitespace-nowrap px-3 py-2 text-neutral-400'>
                        {new Date(v.createdAt).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className='px-3 py-2 text-neutral-300'>
                        {[formatCountry(v.countryCode), v.region, v.city].filter(Boolean).join(' · ') ||
                          '—'}
                      </td>
                      <td className='max-w-[180px] truncate px-3 py-2 font-mono text-[10px] text-neutral-500'>
                        {v.path}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
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

      <section className='mb-12'>
        <h2 className='mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400'>
          Bloqueos por IP (CIDR)
        </h2>
        <div className='mb-4 flex flex-wrap gap-3'>
          <input
            className='min-w-[200px] flex-1 border border-white/10 bg-black/50 px-3 py-2 font-mono text-xs text-white outline-none placeholder:text-neutral-600 focus:border-[#3b82f6]/50'
            onChange={(e) => setIpCidr(e.target.value)}
            placeholder='Ej. 203.0.113.50/32 o 203.0.113.0/24'
            type='text'
            value={ipCidr}
          />
          <input
            className='min-w-[160px] flex-1 border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-[#3b82f6]/50'
            onChange={(e) => setIpReason(e.target.value)}
            placeholder='Motivo (opcional)'
            type='text'
            value={ipReason}
          />
          <button
            className='border border-[#3b82f6]/40 bg-[#3b82f6]/15 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-[#93c5fd] transition hover:bg-[#3b82f6]/25'
            type='button'
            onClick={() => void addIpBan()}
          >
            Añadir bloqueo
          </button>
        </div>
        <div className='overflow-x-auto rounded-sm border border-white/10'>
          <table className='w-full text-left text-xs'>
            <thead className='border-b border-white/10 bg-black/40 text-[9px] font-bold uppercase tracking-widest text-neutral-500'>
              <tr>
                <th className='px-4 py-3'>CIDR</th>
                <th className='px-4 py-3'>Motivo</th>
                <th className='px-4 py-3'>Creado</th>
                <th className='px-4 py-3 text-right'>Quitar</th>
              </tr>
            </thead>
            <tbody>
              {ipBans.length === 0 ? (
                <tr>
                  <td className='px-4 py-6 text-neutral-500' colSpan={4}>
                    No hay rangos bloqueados.
                  </td>
                </tr>
              ) : (
                ipBans.map((b) => (
                  <tr key={b.id} className='border-b border-white/5'>
                    <td className='px-4 py-3 font-mono text-neutral-200'>{b.cidr}</td>
                    <td className='px-4 py-3 text-neutral-500'>{b.reason ?? '—'}</td>
                    <td className='px-4 py-3 text-neutral-600'>
                      {new Date(b.created_at).toLocaleString('es-AR')}
                      {b.created_by_email ? (
                        <span className='ml-2 text-[10px]'>por {b.created_by_email}</span>
                      ) : null}
                    </td>
                    <td className='px-4 py-3 text-right'>
                      <button
                        className='text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition hover:text-red-400'
                        type='button'
                        onClick={() => void removeIpBan(b.id)}
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

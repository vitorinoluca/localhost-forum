import { Bell, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AuthUser } from '../../api';
import { siteDisplayName } from '../../lib/site-brand';
import type { Route } from '../../types';
import { AvatarCircle } from '../profile/ProfileViews';

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <span
      aria-hidden={true}
      className='absolute -right-1 -top-1 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#3b82f6] px-1 text-[9px] font-bold leading-none text-white'
    >
      {label}
    </span>
  );
}

const linkMuted =
  'text-xs font-bold uppercase tracking-widest text-neutral-500 transition hover:text-white';
const btnPrimary =
  'border border-white bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-black hover:text-white';

export function NavBar({
  navigate,
  route,
  user,
  onLogout,
  notificationsUnread = 0,
}: {
  navigate: (route: Route) => void;
  route: Route;
  user: AuthUser | null;
  onLogout: () => void;
  notificationsUnread?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const showExploreLink = route === '/login' || route === '/register';

  useEffect(() => {
    setMenuOpen(false);
  }, [route]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  function go(next: Route) {
    navigate(next);
    setMenuOpen(false);
  }

  return (
    <header className='sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-sm'>
      <div className='mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6'>
        <button
          aria-label={`Ir al inicio · ${siteDisplayName}`}
          className='min-w-0 shrink truncate text-left font-mono text-base font-semibold tracking-tight text-white sm:text-lg'
          onClick={() => go('/')}
          type='button'
        >
          {siteDisplayName}
        </button>

        {/* Escritorio */}
        <nav aria-label='Principal' className='hidden items-center gap-6 md:flex lg:gap-8'>
          {showExploreLink ? (
            <button className={linkMuted} onClick={() => navigate('/')} type='button'>
              Explorar
            </button>
          ) : null}
          {user ? (
            <div className='flex items-center gap-3 lg:gap-4'>
              <button
                aria-label={`Notificaciones${notificationsUnread ? ` (${notificationsUnread} sin leer)` : ''}`}
                className='relative rounded-md p-2 text-neutral-400 transition hover:bg-white/5 hover:text-white'
                type='button'
                onClick={() => navigate('/notifications')}
              >
                <Bell aria-hidden={true} size={20} strokeWidth={2} />
                <Badge count={notificationsUnread} />
              </button>
              {user.role === 'superadmin' ? (
                <button
                  aria-label='Ir a administración'
                  className='text-[9px] font-bold uppercase tracking-widest text-[#3b82f6] transition hover:text-[#93c5fd]'
                  onClick={() => navigate('/admin')}
                  type='button'
                >
                  Admin
                </button>
              ) : null}
              <button
                aria-label={`Ir a mi perfil (${user.name})`}
                className='flex items-center gap-3 rounded-sm border border-transparent px-2 py-1 transition hover:border-white/10'
                type='button'
                onClick={() => navigate(`/users/${user.id}`)}
              >
                <AvatarCircle avatarUrl={user.avatarUrl} className='h-8 w-8 text-[10px]' name={user.name} />
                <span className='hidden text-[10px] font-bold uppercase tracking-tight text-white lg:inline'>
                  {user.name}
                </span>
              </button>
              <button
                className='text-[9px] font-bold uppercase tracking-widest text-neutral-500 transition hover:text-white'
                type='button'
                onClick={onLogout}
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div className='flex items-center gap-4 lg:gap-6'>
              <button className={linkMuted} onClick={() => navigate('/login')} type='button'>
                Iniciar sesión
              </button>
              <button className={btnPrimary} onClick={() => navigate('/register')} type='button'>
                Registrarse
              </button>
            </div>
          )}
        </nav>

        {/* Móvil: menú */}
        <div className='flex shrink-0 items-center md:hidden'>
          <button
            aria-expanded={menuOpen}
            aria-controls='mobile-nav-panel'
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className='rounded-md p-2 text-neutral-300 transition hover:bg-white/10 hover:text-white'
            onClick={() => setMenuOpen((o) => !o)}
            type='button'
          >
            {menuOpen ? <X aria-hidden={true} size={22} strokeWidth={2} /> : <Menu aria-hidden={true} size={22} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* Panel móvil */}
      {menuOpen ? (
        <div
          className='border-t border-white/10 bg-neutral-950/98 px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.45)] md:hidden'
          id='mobile-nav-panel'
        >
          <nav aria-label='Principal (móvil)' className='flex flex-col gap-1'>
            {showExploreLink ? (
              <button
                className='rounded-md px-3 py-3 text-left text-sm font-bold uppercase tracking-widest text-neutral-400 transition hover:bg-white/5 hover:text-white'
                onClick={() => go('/')}
                type='button'
              >
                Explorar
              </button>
            ) : null}
            {user ? (
              <>
                <button
                  className='relative flex items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-bold uppercase tracking-widest text-neutral-400 transition hover:bg-white/5 hover:text-white'
                  onClick={() => go('/notifications')}
                  type='button'
                >
                  <Bell aria-hidden={true} size={18} strokeWidth={2} />
                  Notificaciones
                  {notificationsUnread > 0 ? (
                    <span className='ml-auto rounded-full bg-[#3b82f6] px-2 py-0.5 text-[10px] font-bold text-white'>
                      {notificationsUnread > 99 ? '99+' : notificationsUnread}
                    </span>
                  ) : null}
                </button>
                {user.role === 'superadmin' ? (
                  <button
                    className='rounded-md px-3 py-3 text-left text-sm font-bold uppercase tracking-widest text-[#3b82f6] transition hover:bg-white/5'
                    onClick={() => go('/admin')}
                    type='button'
                  >
                    Administración
                  </button>
                ) : null}
                <button
                  className='flex items-center gap-3 rounded-md px-3 py-3 text-left transition hover:bg-white/5'
                  onClick={() => go(`/users/${user.id}` as Route)}
                  type='button'
                >
                  <AvatarCircle avatarUrl={user.avatarUrl} className='h-9 w-9 text-[10px]' name={user.name} />
                  <span className='text-sm font-bold uppercase tracking-tight text-white'>{user.name}</span>
                </button>
                <button
                  className='rounded-md px-3 py-3 text-left text-sm font-bold uppercase tracking-widest text-neutral-500 transition hover:bg-white/5 hover:text-white'
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  type='button'
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  className='rounded-md px-3 py-3 text-left text-sm font-bold uppercase tracking-widest text-neutral-400 transition hover:bg-white/5 hover:text-white'
                  onClick={() => go('/login')}
                  type='button'
                >
                  Iniciar sesión
                </button>
                <button
                  className='mt-1 rounded-md border border-white bg-white px-3 py-3 text-center text-sm font-bold uppercase tracking-widest text-black transition hover:bg-neutral-200'
                  onClick={() => go('/register')}
                  type='button'
                >
                  Registrarse
                </button>
              </>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

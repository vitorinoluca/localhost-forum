import { Bell } from 'lucide-react';
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
  const showExploreLink = route === '/login' || route === '/register';

  return (
    <header className='sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-sm'>
      <div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-6'>
        <button
          aria-label={`Ir al inicio · ${siteDisplayName}`}
          className='font-mono text-lg font-semibold tracking-tight text-white'
          onClick={() => navigate('/')}
          type='button'
        >
          {siteDisplayName}
        </button>
        <nav aria-label='Principal' className='flex items-center gap-8'>
          {showExploreLink ? (
            <button
              className='text-xs font-bold uppercase tracking-widest text-neutral-500 transition hover:text-white'
              onClick={() => navigate('/')}
              type='button'
            >
              Explorar
            </button>
          ) : null}
          {user ? (
            <div className='flex items-center gap-3 sm:gap-4'>
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
                <span className='hidden text-[10px] font-bold uppercase tracking-tight text-white sm:inline'>
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
            <div className='flex items-center gap-6'>
              <button
                className='text-xs font-bold uppercase tracking-widest text-neutral-500 transition hover:text-white'
                onClick={() => navigate('/login')}
                type='button'
              >
                Iniciar sesión
              </button>
              <button
                className='border border-white bg-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-black hover:text-white'
                onClick={() => navigate('/register')}
                type='button'
              >
                Registrarse
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

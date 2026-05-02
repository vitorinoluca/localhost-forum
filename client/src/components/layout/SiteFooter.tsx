import { siteDisplayName } from '../../lib/site-brand';
import type { Route } from '../../types';

const linkClass =
  'text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition hover:text-white';

export function SiteFooter({
  navigate,
  route,
}: {
  navigate: (route: Route) => void;
  route: Route;
}) {
  const onLegal = route === '/terms' || route === '/privacy' || route === '/contact';

  return (
    <footer
      className={
        onLegal
          ? 'mt-auto border-t border-white/10 bg-neutral-950'
          : 'border-t border-white/10 bg-neutral-950/80'
      }
    >
      <div className='mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between'>
        <nav aria-label='Legal' className='flex flex-wrap items-center gap-x-6 gap-y-2'>
          <button className={linkClass} type='button' onClick={() => navigate('/terms')}>
            Términos
          </button>
          <button className={linkClass} type='button' onClick={() => navigate('/privacy')}>
            Privacidad
          </button>
          <button className={linkClass} type='button' onClick={() => navigate('/contact')}>
            Contacto
          </button>
        </nav>
        <p className='font-mono text-[10px] text-neutral-600'>{siteDisplayName}</p>
      </div>
    </footer>
  );
}

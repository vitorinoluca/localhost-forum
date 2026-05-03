import type { Route } from '../../types';

export function NotFoundPage({ navigate }: { navigate: (route: Route) => void }) {
  return (
    <div className='mx-auto max-w-lg px-6 py-24 text-center'>
      <p className='text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-600'>404</p>
      <h1 className='font-["Outfit"] mt-4 text-2xl font-bold uppercase tracking-tight text-white'>
        Página no encontrada
      </h1>
      <p className='mt-4 text-sm leading-relaxed text-neutral-400'>
        La ruta que buscás no existe o fue movida.
      </p>
      <button
        className='mt-10 rounded-sm border border-[#3b82f6] bg-[#3b82f6] px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white transition hover:bg-[#2563eb] active:scale-[0.98]'
        type='button'
        onClick={() => navigate('/')}
      >
        Ir al inicio
      </button>
    </div>
  );
}

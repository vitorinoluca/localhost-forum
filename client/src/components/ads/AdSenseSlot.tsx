import { useEffect, useRef } from 'react';
import { getAdSenseClient, isAdLayoutPreview } from '../../lib/ads-config';
import { loadAdSenseScript } from '../../lib/load-ad-sense-script';

type AdSenseSlotProps = {
  slot?: string;
  format?: string;
  className?: string;
};

function placeholderMinHeightClass(format: string | undefined): string {
  switch (format) {
    case 'vertical':
      return 'min-h-[280px] md:min-h-[360px]';
    case 'rectangle':
      return 'min-h-[250px]';
    case 'horizontal':
    default:
      return 'min-h-[90px] sm:min-h-[100px] md:min-h-[110px]';
  }
}

export function AdLayoutPlaceholder({
  format = 'horizontal',
  className = '',
}: {
  format?: string;
  className?: string;
}) {
  const h = placeholderMinHeightClass(format);
  return (
    <div
      className={`ad-slot-preview mx-auto w-full max-w-5xl overflow-hidden rounded-md border border-dashed border-amber-500/35 bg-neutral-900/70 ${h} ${className}`}
      role='img'
      aria-label='Vista previa del espacio publicitario'
    >
      <div className='flex h-full min-h-[inherit] flex-col items-center justify-center gap-1 px-4 py-4 text-center'>
        <span className='text-[10px] font-bold uppercase tracking-[0.25em] text-amber-200/80'>
          Espacio publicitario
        </span>
        <span className='text-[11px] text-neutral-500'>
          Vista previa · AdSense responsive ({format})
        </span>
        <span className='max-w-md text-[10px] leading-snug text-neutral-600'>
          En producción Google rellena este hueco; altura variable según inventario.
        </span>
      </div>
    </div>
  );
}

export function AdSenseSlot({ slot, format = 'auto', className = '' }: AdSenseSlotProps) {
  const preview = isAdLayoutPreview();
  const client = getAdSenseClient();
  const pushedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preview || !client || !slot || pushedRef.current) return;

    let cancelled = false;

    void loadAdSenseScript(client)
      .then(() => {
        if (cancelled || pushedRef.current || !containerRef.current?.querySelector('.adsbygoogle')) {
          return;
        }
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushedRef.current = true;
        } catch {
          pushedRef.current = false;
        }
      })
      .catch(() => {
        pushedRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [preview, client, slot]);

  if (preview) {
    return <AdLayoutPlaceholder className={className} format={format} />;
  }

  if (!client || !slot) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`ad-slot mx-auto w-full max-w-5xl text-center ${className}`}
      data-ad-slot-wrapper={slot}
    >
      <ins
        className='adsbygoogle'
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive='true'
      />
    </div>
  );
}

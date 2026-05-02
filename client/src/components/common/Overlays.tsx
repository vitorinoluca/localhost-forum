import { apiUrl } from '../../api';
import type { ForumAttachment } from '../../types';
import { Spinner } from './Spinner';

export function GlobalLoadingOverlay() {
  return (
    <div className='pointer-events-none fixed inset-0 z-40 grid place-items-center bg-neutral-950/40 backdrop-blur-[1px]'>
      <div className='rounded-full border border-white/15 bg-black/60 p-5 shadow-lg shadow-black/30'>
        <Spinner label='Cargando' size='md' />
      </div>
    </div>
  );
}

export function ImageLightbox({
  attachment,
  onClose,
}: {
  attachment: ForumAttachment;
  onClose: () => void;
}) {
  return (
    <div
      className='fixed inset-0 z-50 bg-black/80 p-6'
      onClick={onClose}
      role='presentation'
    >
      <div className='grid h-full place-items-center'>
        <img
          alt={attachment.originalName}
          className='max-h-[90vh] max-w-[90vw] rounded-2xl border border-white/20 object-contain shadow-2xl shadow-black/40'
          onClick={(event) => event.stopPropagation()}
          src={apiUrl(attachment.url)}
        />
      </div>
    </div>
  );
}

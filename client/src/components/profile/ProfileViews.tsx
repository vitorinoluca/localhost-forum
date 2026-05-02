import type { FormEvent } from 'react';
import { useEffect, useMemo } from 'react';
import { Images } from 'lucide-react';
import { apiUrl, type AuthUser } from '../../api';
import { getAdSlot, shouldShowAdPlacement } from '../../lib/ads-config';
import type { PublicProfile, Route } from '../../types';
import { AdSenseSlot } from '../ads/AdSenseSlot';
import { Alert, Field, SubmitButton, TextAreaField } from '../common/FormControls';
import { Spinner } from '../common/Spinner';

function resolveAvatarSrc(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('blob:') || /^https?:\/\//i.test(url)) return url;
  return apiUrl(url);
}

export function AvatarCircle({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl: string | null;
  className?: string;
}) {
  const base = `flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-neutral-900 ${className ?? ''}`;
  const src = resolveAvatarSrc(avatarUrl);
  if (src) {
    return (
      <span className={base}>
        <img alt={name} className='h-full w-full object-cover' src={src} />
      </span>
    );
  }
  return (
    <span className={`${base} text-xs font-bold text-neutral-500`}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function PublicProfileView({
  profile,
  loading,
  errorMessage,
  viewerId,
  showAds,
  onNavigate,
  onEditOwnProfile,
}: {
  profile: PublicProfile | null;
  loading: boolean;
  errorMessage: string;
  viewerId: string | null;
  showAds: boolean;
  onNavigate: (route: Route) => void;
  onEditOwnProfile: () => void;
}) {
  const profileAdSlot = showAds ? getAdSlot('profile') : undefined;
  const showProfileAd = shouldShowAdPlacement(showAds, profileAdSlot);
  return (
    <section className='mx-auto w-full max-w-2xl px-6 py-12'>
      <button
        className='mb-10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 transition hover:text-white'
        type='button'
        onClick={() => onNavigate('/')}
      >
        <svg className='h-3 w-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path d='M15 19l-7-7 7-7' strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' />
        </svg>
        Volver
      </button>

      {loading ? (
        <div className='flex justify-center py-16'>
          <Spinner label='Cargando perfil' size='lg' />
        </div>
      ) : null}

      {errorMessage ? (
        <Alert variant='error'>{errorMessage}</Alert>
      ) : null}

      {!loading && profile ? (
        <div className='space-y-8 rounded-sm border border-white/10 bg-[#0f0f12] p-8'>
          <div className='flex flex-col gap-6 sm:flex-row sm:items-start'>
            <AvatarCircle avatarUrl={profile.avatarUrl} className='h-24 w-24 text-2xl' name={profile.name} />
            <div className='min-w-0 flex-1 space-y-3'>
              <h1 className='font-["Outfit"] text-3xl font-bold uppercase tracking-tighter text-white'>
                {profile.name}
              </h1>
              <p className='text-[10px] font-bold uppercase tracking-widest text-neutral-600'>
                Miembro desde{' '}
                {new Intl.DateTimeFormat('es', {
                  month: 'long',
                  year: 'numeric',
                }).format(new Date(profile.createdAt))}
              </p>
              <p className='flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600'>
                <Images aria-hidden={true} className='text-neutral-500' size={16} strokeWidth={2} />
                <span>
                  {profile.postsCount === 1
                    ? '1 publicacion'
                    : `${profile.postsCount} publicaciones`}
                </span>
              </p>
              {viewerId === profile.id ? (
                <button
                  className='rounded-sm border border-[#3b82f6] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#3b82f6] transition hover:bg-[#3b82f6] hover:text-white'
                  type='button'
                  onClick={onEditOwnProfile}
                >
                  Editar perfil
                </button>
              ) : null}
            </div>
          </div>

          <div className='border-t border-white/5 pt-8'>
            <h2 className='text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500'>
              Biografía
            </h2>
            <p className='mt-4 whitespace-pre-wrap text-sm leading-relaxed text-neutral-300'>
              {profile.bio?.trim()
                ? profile.bio
                : 'Este usuario todavía no escribió una biografía.'}
            </p>
          </div>

          {showProfileAd ? (
            <div className='flex min-h-[100px] justify-center border-t border-white/5 pt-8'>
              <AdSenseSlot format='horizontal' slot={profileAdSlot} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function ProfileEditView({
  user,
  profileName,
  profileBio,
  profileAvatarFile,
  profileRemoveAvatar,
  saving,
  message,
  onNameChange,
  onBioChange,
  onAvatarFileChange,
  onRemoveAvatarChange,
  onSubmit,
  onCancel,
}: {
  user: AuthUser;
  profileName: string;
  profileBio: string;
  profileAvatarFile: File | null;
  profileRemoveAvatar: boolean;
  saving: boolean;
  message: string;
  onNameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onAvatarFileChange: (file: File | null) => void;
  onRemoveAvatarChange: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const blobPreview = useMemo(() => {
    if (!profileAvatarFile) return null;
    return URL.createObjectURL(profileAvatarFile);
  }, [profileAvatarFile]);

  useEffect(() => {
    return () => {
      if (blobPreview) URL.revokeObjectURL(blobPreview);
    };
  }, [blobPreview]);

  const displayAvatar = profileAvatarFile
    ? blobPreview
    : profileRemoveAvatar
      ? null
      : user.avatarUrl;

  return (
    <section className='mx-auto w-full max-w-lg px-6 py-12'>
      <button
        className='mb-10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 transition hover:text-white'
        type='button'
        onClick={onCancel}
      >
        <svg className='h-3 w-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path d='M15 19l-7-7 7-7' strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' />
        </svg>
        Volver al perfil
      </button>

      <div className='rounded-sm border border-white/10 bg-[#0f0f12] p-8'>
        <h1 className='font-["Outfit"] text-2xl font-bold uppercase tracking-tighter text-white'>
          Editar perfil
        </h1>
        <p className='mt-2 text-xs text-neutral-500'>
          Nombre publico, bio y foto. Tu email no se muestra en el perfil.
        </p>

        <form className='mt-8 space-y-6' onSubmit={onSubmit}>
          <div className='flex items-center gap-6'>
            <AvatarCircle
              avatarUrl={displayAvatar}
              className='h-20 w-20 text-xl'
              name={profileName || user.name}
            />
            <div className='space-y-3'>
              <label className='block'>
                <span className='text-[10px] font-bold uppercase tracking-widest text-neutral-600'>
                  Foto de perfil
                </span>
                <input
                  accept='image/jpeg,image/png,image/webp'
                  className='mt-2 block w-full text-xs text-neutral-400 file:mr-3 file:rounded-sm file:border file:border-white/10 file:bg-neutral-900 file:px-3 file:py-2 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:text-white'
                  type='file'
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    onAvatarFileChange(file);
                    if (file) onRemoveAvatarChange(false);
                  }}
                />
              </label>
              {user.avatarUrl || profileAvatarFile ? (
                <label className='flex cursor-pointer items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500'>
                  <input
                    checked={profileRemoveAvatar}
                    type='checkbox'
                    onChange={(event) => {
                      onRemoveAvatarChange(event.target.checked);
                      if (event.target.checked) onAvatarFileChange(null);
                    }}
                  />
                  Quitar foto
                </label>
              ) : null}
            </div>
          </div>

          <Field label='Nombre visible' value={profileName} onChange={onNameChange} autoComplete='name' />

          <TextAreaField label='Bio' maxLength={500} placeholder='Algo sobre vos...' value={profileBio} onChange={onBioChange} />

          <SubmitButton loading={saving}>Guardar perfil</SubmitButton>
        </form>

        {message ? (
          <div className='mt-6'>
            <Alert>{message}</Alert>
          </div>
        ) : null}
      </div>
    </section>
  );
}

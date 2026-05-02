import { useEffect, useRef } from 'react';

let gsiLoadPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiLoadPromise) {
    gsiLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Sign-In'));
      document.head.appendChild(script);
    });
  }
  return gsiLoadPromise;
}

export function GoogleSignInButton({
  clientId,
  disabled,
  onCredential,
}: {
  clientId: string;
  disabled?: boolean;
  onCredential: (credential: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredRef = useRef(onCredential);
  const disabledRef = useRef(Boolean(disabled));

  useEffect(() => {
    onCredRef.current = onCredential;
    disabledRef.current = Boolean(disabled);
  }, [disabled, onCredential]);

  useEffect(() => {
    if (!clientId) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    void loadGsiScript()
      .then(() => {
        if (cancelled || !el) return;
        const google = window.google;
        if (!google?.accounts?.id) return;

        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential: string }) => {
            if (disabledRef.current) return;
            onCredRef.current(response.credential);
          },
        });

        el.innerHTML = '';
        google.accounts.id.renderButton(el, {
          theme: 'filled_black',
          size: 'large',
          width: 320,
          text: 'continue_with',
          locale: 'es',
        });
      })
      .catch(() => {
        el.innerHTML = '';
      });

    return () => {
      cancelled = true;
      el.innerHTML = '';
      window.google?.accounts?.id.cancel();
    };
  }, [clientId]);

  return (
    <div
      ref={containerRef}
      className={`flex min-h-[44px] justify-center [&>div]:flex [&>div]:w-full [&>div]:justify-center ${
        disabled ? 'pointer-events-none opacity-50' : ''
      }`}
    />
  );
}

import type { ReactNode } from 'react';

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  inputMode,
  maxLength,
  placeholder,
  invalid,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: 'numeric';
  maxLength?: number;
  placeholder?: string;
  invalid?: boolean;
  required?: boolean;
}) {
  return (
    <label className='block'>
      <span
        className={`text-[10px] font-bold uppercase tracking-widest ${
          invalid ? 'text-red-400' : 'text-neutral-600'
        }`}
      >
        {label}
      </span>
      <input
        aria-invalid={invalid ? true : undefined}
        autoComplete={autoComplete}
        className={`mt-2 w-full rounded-sm border bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 ${
          invalid
            ? 'border-red-500 ring-1 ring-red-500/35 focus:border-red-400'
            : 'border-white/10 focus:border-[#3b82f6]'
        }`}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  rows = 5,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className='block'>
      <span className='text-[10px] font-bold uppercase tracking-widest text-neutral-600'>
        {label}
      </span>
      <textarea
        className='mt-2 min-h-[120px] w-full resize-y rounded-sm border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#3b82f6]'
        maxLength={maxLength}
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function SubmitButton({
  children,
  loading,
}: {
  children: string;
  loading: boolean;
}) {
  return (
    <button
      className='flex items-center justify-center rounded-sm border border-[#3b82f6] bg-[#3b82f6] px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#2563eb] active:scale-[0.98] disabled:opacity-30 w-full'
      disabled={loading}
      type='submit'
    >
      {loading ? 'Procesando…' : children.toUpperCase()}
    </button>
  );
}

export function Alert({
  children,
  variant = 'neutral',
}: {
  children: ReactNode;
  variant?: 'neutral' | 'error';
}) {
  const styles =
    variant === 'error'
      ? 'border-red-500/50 bg-red-950/35 text-red-200'
      : 'border-white/10 bg-neutral-950 text-white';

  return (
    <div className={`p-4 text-xs font-bold uppercase tracking-widest ${styles}`}>{children}</div>
  );
}

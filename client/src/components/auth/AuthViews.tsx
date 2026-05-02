import type { FormEvent, ReactNode } from 'react';
import type { RegisterFieldErrorsState } from '../../utils/register-fields';
import { Alert, Field, SubmitButton } from '../common/FormControls';
import { GoogleSignInButton } from './GoogleSignInButton';

function AuthDivider() {
  return (
    <div className='relative my-6'>
      <div aria-hidden={true} className='absolute inset-0 flex items-center'>
        <div className='w-full border-t border-neutral-800' />
      </div>
      <div className='relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-neutral-600'>
        <span className='bg-neutral-950 px-3'>o continúa con</span>
      </div>
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className='mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl place-items-center px-6 py-10'>
      <div className='w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-950 p-6 shadow-2xl shadow-black/30'>
        <h1 className='text-2xl font-semibold tracking-normal text-white'>
          {title}
        </h1>
        <p className='mt-2 text-sm leading-6 text-neutral-400'>{subtitle}</p>
        <div className='mt-6'>{children}</div>
      </div>
    </section>
  );
}

export function LoginView({
  email,
  password,
  message,
  authLoading,
  fieldError,
  googleClientId,
  onEmailChange,
  onPasswordChange,
  onGoogleCredential,
  onSubmit,
}: {
  email: string;
  password: string;
  message: string;
  authLoading: boolean;
  fieldError: boolean;
  googleClientId: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onGoogleCredential: (credential: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <AuthShell
      title='Iniciar sesión'
      subtitle={
        googleClientId
          ? 'Correo y contraseña, o tu cuenta de Google.'
          : 'Entra con tu correo y contraseña.'
      }
    >
      <form className='space-y-4' onSubmit={onSubmit}>
        <Field
          label='Correo electrónico'
          type='email'
          invalid={fieldError}
          value={email}
          onChange={onEmailChange}
          autoComplete='email'
        />
        <Field
          label='Contraseña'
          type='password'
          invalid={fieldError}
          value={password}
          onChange={onPasswordChange}
          autoComplete='current-password'
        />
        <SubmitButton loading={authLoading}>Iniciar sesión</SubmitButton>
      </form>
      {googleClientId ? (
        <>
          <AuthDivider />
          <GoogleSignInButton
            clientId={googleClientId}
            disabled={authLoading}
            onCredential={onGoogleCredential}
          />
        </>
      ) : null}
      {message ? (
        <Alert variant={fieldError ? 'error' : 'neutral'}>{message}</Alert>
      ) : null}
    </AuthShell>
  );
}

export function RegisterView({
  name,
  email,
  password,
  message,
  authLoading,
  fieldErrors,
  googleClientId,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onGoogleCredential,
  onSubmit,
}: {
  name: string;
  email: string;
  password: string;
  message: string;
  authLoading: boolean;
  fieldErrors: RegisterFieldErrorsState;
  googleClientId: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onGoogleCredential: (credential: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const hasRegisterError = fieldErrors.name || fieldErrors.email || fieldErrors.password;

  return (
    <AuthShell
      title='Crear cuenta'
      subtitle={
        googleClientId
          ? 'Registro con correo y código, o cuenta Google sin contraseña.'
          : 'Luego verificaremos tu email para activar la cuenta.'
      }
    >
      <form className='space-y-4' onSubmit={onSubmit}>
        <Field
          label='Nombre'
          invalid={fieldErrors.name}
          value={name}
          onChange={onNameChange}
          autoComplete='name'
        />
        <Field
          label='Correo electrónico'
          type='email'
          invalid={fieldErrors.email}
          value={email}
          onChange={onEmailChange}
          autoComplete='email'
        />
        <div>
          <Field
            label='Contraseña'
            type='password'
            invalid={fieldErrors.password}
            value={password}
            onChange={onPasswordChange}
            autoComplete='new-password'
          />
          <p
            className={`mt-2 space-y-0.5 text-[10px] font-bold uppercase tracking-widest ${
              fieldErrors.password ? 'text-red-400/90' : 'text-neutral-600'
            }`}
          >
            <span className='block'>Mínimo 8 caracteres</span>
            <span className='block'>Al menos un número</span>
            <span className='block'>Al menos un símbolo</span>
          </p>
        </div>
        <SubmitButton loading={authLoading}>Continuar</SubmitButton>
      </form>
      {googleClientId ? (
        <>
          <AuthDivider />
          <GoogleSignInButton
            clientId={googleClientId}
            disabled={authLoading}
            onCredential={onGoogleCredential}
          />
        </>
      ) : null}
      {message ? (
        <Alert variant={hasRegisterError ? 'error' : 'neutral'}>{message}</Alert>
      ) : null}
    </AuthShell>
  );
}

export function VerifyEmailView({
  code,
  emailMasked,
  message,
  devCode,
  authLoading,
  codeFieldError,
  onCodeChange,
  onVerify,
  onResend,
}: {
  code: string;
  emailMasked: string;
  message: string;
  devCode: string;
  authLoading: boolean;
  codeFieldError: boolean;
  onCodeChange: (value: string) => void;
  onVerify: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
}) {
  return (
    <AuthShell
      title='Verifica tu email'
      subtitle={
        emailMasked
          ? `Enviamos un código a ${emailMasked}.`
          : 'Preparando el envío del código.'
      }
    >
      <form className='space-y-4' onSubmit={onVerify}>
        <Field
          label='Código de 6 dígitos'
          invalid={codeFieldError}
          value={code}
          onChange={onCodeChange}
          inputMode='numeric'
          maxLength={6}
        />
        <SubmitButton loading={authLoading}>Verificar</SubmitButton>
        <button
          className='w-full rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-900 disabled:opacity-60'
          disabled={authLoading}
          onClick={onResend}
          type='button'
        >
          Reenviar código
        </button>
      </form>
      {message ? (
        <Alert variant={codeFieldError ? 'error' : 'neutral'}>{message}</Alert>
      ) : null}
      {devCode ? (
        <div className='mt-4 rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100'>
          Código dev:{' '}
          <span className='font-semibold tracking-widest'>{devCode}</span>
        </div>
      ) : null}
    </AuthShell>
  );
}

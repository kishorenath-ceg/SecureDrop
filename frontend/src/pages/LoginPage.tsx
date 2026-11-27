import { FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { loginUser, registerUser, requestPasswordReset } from '../services/authService';
import { BrandLogo } from '../components/BrandLogo';
import { appEnv } from '../lib/env';

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaMessage, setCaptchaMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const changeMode = (nextMode: 'login' | 'register' | 'forgot') => {
    setMode(nextMode);
    setStatus(null);
    setCaptchaMessage(null);
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!appEnv.turnstileSiteKey) {
      setStatus({ message: 'Security verification is not configured. Set VITE_TURNSTILE_SITE_KEY to continue.', tone: 'error' });
      return;
    }

    if (!captchaToken) {
      setStatus({ message: 'Complete the security check before continuing.', tone: 'error' });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      if (mode === 'forgot') {
        const response = await requestPasswordReset({ email, captchaToken });

        if (response.success) {
          setStatus({ message: response.data.message, tone: 'success' });
        } else {
          setStatus({ message: response.error.message, tone: 'error' });
        }

        return;
      }

      const response = mode === 'login'
        ? await loginUser({ email, password, captchaToken })
        : await registerUser({ email, password, displayName: displayName || undefined, captchaToken });

      if (response.success) {
        setStatus({ message: response.data.message ?? 'Authentication successful.', tone: 'success' });
        navigate('/dashboard');
        return;
      }

      setStatus({ message: response.error.message ?? 'Authentication failed.', tone: 'error' });
    } catch (error) {
      setStatus({
        message: error instanceof Error ? error.message : 'Authentication failed.',
        tone: 'error',
      });
    } finally {
      setIsSubmitting(false);
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    }
  };

  return (
    <main className="transfer-shell relative min-h-screen overflow-hidden px-5 pb-12 pt-6 text-white sm:px-8">
      <div aria-hidden="true" className="transfer-orb transfer-orb-one" />
      <div aria-hidden="true" className="transfer-orb transfer-orb-two" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
        <BrandLogo />
        <a href="/" className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
          Back to home
        </a>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 py-12 lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[1fr_0.85fr] lg:py-8">
        <div className="motion-enter">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Private transfers, on your terms
          </span>
          <h1 className="mt-7 max-w-xl text-5xl font-black leading-[1.04] tracking-tight sm:text-6xl">
            Your files,
            <span className="block text-cyan-100">in trusted hands.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-indigo-50/90">
            Sign in to manage your uploads, protect share links, and keep track of every transfer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-white/90">
            <span className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/20">Private storage</span>
            <span className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/20">Secure links</span>
            <span className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/20">You stay in control</span>
          </div>
        </div>

        <div className="transfer-card-3d motion-enter motion-enter-delay mx-auto w-full max-w-lg rounded-[2rem] border border-white/60 bg-white/95 p-6 text-slate-900 shadow-[0_32px_100px_rgba(22,25,87,0.28)] backdrop-blur-xl sm:p-9">
          <div className="mb-7">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-500">
              {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Get started' : 'Account recovery'}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {mode === 'login' ? 'Sign in to SecureDrop' : mode === 'register' ? 'Create your account' : 'Reset your password'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {mode === 'login'
                ? 'Pick up where you left off.'
                : mode === 'register'
                  ? 'Create an account to start sharing securely.'
                  : 'Enter your email and we’ll send a password reset link if an account matches.'}
            </p>
          </div>

          {mode === 'forgot' ? (
            <button
              type="button"
              onClick={() => changeMode('login')}
              className="mb-6 rounded-lg px-1 py-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
            >
              Back to sign in
            </button>
          ) : (
            <div className="mb-6 grid grid-cols-2 rounded-xl bg-indigo-50 p-1">
              <button
                type="button"
                onClick={() => changeMode('login')}
                className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                  mode === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => changeMode('register')}
                className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                  mode === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create account
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <label className="block text-sm font-semibold text-slate-700">
                Display name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Your name"
                />
              </label>
            )}

            <label className="block text-sm font-semibold text-slate-700">
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="you@example.com"
              />
            </label>

            {mode !== 'forgot' && (
              <label className="block text-sm font-semibold text-slate-700">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Enter your password"
                />
              </label>
            )}

            {mode === 'login' && (
              <div className="-mt-1 text-right">
                <button
                  type="button"
                  onClick={() => changeMode('forgot')}
                  className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <div className="space-y-2">
              {appEnv.turnstileSiteKey ? (
                <Turnstile
                  ref={turnstileRef}
                  siteKey={appEnv.turnstileSiteKey}
                  options={{ theme: 'light', size: 'flexible' }}
                  onSuccess={(token) => {
                    setCaptchaToken(token);
                    setCaptchaMessage(null);
                  }}
                  onExpire={() => {
                    setCaptchaToken(null);
                    setCaptchaMessage('Security check expired. Please complete it again.');
                  }}
                  onError={() => {
                    setCaptchaToken(null);
                    setCaptchaMessage('Security check failed to load. Please try again.');
                  }}
                />
              ) : (
                <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                  Security verification is unavailable. Configure VITE_TURNSTILE_SITE_KEY to enable authentication.
                </p>
              )}
              {captchaMessage && (
                <p role="alert" className="text-sm text-rose-700">
                  {captchaMessage}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !captchaToken}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-indigo-200 transition duration-300 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in securely'
                  : mode === 'register'
                    ? 'Create account'
                    : 'Send reset link'}
            </button>
          </form>

          {status && (
            <p
              role={status.tone === 'error' ? 'alert' : 'status'}
              className={`mt-5 rounded-xl border p-3 text-sm ${
                status.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {status.message}
            </p>
          )}
          <p className="mt-5 text-center text-xs text-slate-400">Your account is protected by Supabase Auth and Cloudflare Turnstile.</p>
        </div>
      </section>
    </main>
  );
}

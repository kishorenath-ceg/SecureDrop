import { BrandLogo } from '../components/BrandLogo';

export function LandingPage() {
  return (
    <main className="transfer-shell relative min-h-screen overflow-hidden px-6 py-6 text-white sm:px-10">
      <div aria-hidden="true" className="transfer-orb transfer-orb-one" />
      <div aria-hidden="true" className="transfer-orb transfer-orb-two" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="flex items-center justify-between">
          <BrandLogo />
          <nav className="flex items-center gap-3">
            <a href="#security" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 sm:inline-flex">
              Security
            </a>
            <a href="/login" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-indigo-800 shadow-lg transition hover:shadow-xl">
              Sign in
            </a>
          </nav>
        </header>

        <section className="grid min-h-[calc(100vh-7rem)] items-center gap-12 py-14 lg:grid-cols-[1fr_0.9fr]">
          <div className="motion-enter">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Private file sharing
            </span>
            <h1 className="mt-7 max-w-2xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Big files.
              <span className="block text-cyan-100">Thoughtful security.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-indigo-50/90">
              Send important files with private storage and share links you can protect, limit, or expire.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/login" className="rounded-xl bg-white px-6 py-3.5 font-bold text-indigo-800 shadow-xl transition duration-300 hover:shadow-2xl">
                Start a transfer
              </a>
              <a href="/login" className="rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 font-bold text-white backdrop-blur transition hover:bg-white/20">
                Open dashboard
              </a>
            </div>
            <div id="security" className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-white/85">
              <span>✓ Private by default</span>
              <span>✓ Password protection</span>
              <span>✓ Expiring links</span>
            </div>
          </div>

          <div className="transfer-card-3d motion-enter motion-enter-delay mx-auto w-full max-w-xl rounded-[2rem] border border-white/65 bg-white/95 p-5 text-slate-900 shadow-[0_32px_100px_rgba(22,25,87,0.28)] backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">A calmer way to send</p>
                <h2 className="mt-2 text-2xl font-bold">Your files, under control</h2>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">↗</span>
            </div>
            <div className="mt-6 rounded-3xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 p-8 text-center transition duration-300 hover:border-indigo-400 hover:bg-indigo-50 sm:p-10">
              <div className="motion-float mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-3xl text-indigo-600 shadow-lg shadow-indigo-100">⇧</div>
              <p className="mt-5 text-lg font-bold">Choose a file to begin</p>
              <p className="mt-2 text-sm text-slate-500">Protect it with a password, expiry, or download limit.</p>
              <a href="/login" className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700">
                Continue securely
              </a>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs font-semibold text-slate-500">
              <span className="rounded-xl bg-slate-50 p-3">Private storage</span>
              <span className="rounded-xl bg-slate-50 p-3">Access controls</span>
              <span className="rounded-xl bg-slate-50 p-3">Share anywhere</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

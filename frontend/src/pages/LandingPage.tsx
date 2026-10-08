export function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="flex items-center justify-between">
          <div className="text-2xl font-semibold tracking-tight">SecureDrop</div>
          <a
            href="/login"
            className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:text-white"
          >
            Sign in
          </a>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
              Secure file sharing
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
              Share files securely.
              <span className="block text-sky-400">Control access and expiry.</span>
            </h1>
            <p className="max-w-xl text-lg text-slate-300">
              Upload, protect, and distribute files with password protection, expiration rules,
              and private backend authorization.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="/login"
                className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Upload file
              </a>
              <a
                href="/dashboard"
                className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                View dashboard
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-sky-950/30">
            <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-950/60 p-8 text-center">
              <div className="text-lg font-semibold text-slate-100">Drop your file here</div>
              <div className="mt-3 text-sm text-slate-400">or browse from your device</div>
              <div className="mt-6 rounded-xl bg-slate-800 px-4 py-3 text-sm text-slate-300">
                Max file size: 100 MB
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

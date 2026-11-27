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
            <a href="#features" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 sm:inline-flex">
              Features
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
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-white/85">
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

        <section aria-labelledby="how-it-works" className="scroll-mt-8 border-t border-white/15 py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-100">Simple by design</p>
            <h2 id="how-it-works" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">How SecureDrop Works</h2>
            <p className="mt-4 text-base leading-7 text-indigo-50/90">
              SecureDrop makes secure file sharing straightforward: upload your files, choose who can access them, and send one link to the people who need them.
            </p>
          </div>
          <ol className="mt-9 grid gap-4 md:grid-cols-3">
            <li className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <span className="text-sm font-black text-cyan-100">01 / UPLOAD</span>
              <h3 className="mt-3 text-xl font-bold">Bring your files together</h3>
              <p className="mt-2 text-sm leading-6 text-indigo-50/85">
                Sign in and upload up to 50 files in a transfer, with a 100 MB per-file limit and 1 GB total. Your files are kept in private storage.
              </p>
            </li>
            <li className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <span className="text-sm font-black text-cyan-100">02 / PROTECT</span>
              <h3 className="mt-3 text-xl font-bold">Choose access settings</h3>
              <p className="mt-2 text-sm leading-6 text-indigo-50/85">
                Add a password, set an expiration date, choose a download limit, or give your link a custom name. These options are yours to configure.
              </p>
            </li>
            <li className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <span className="text-sm font-black text-cyan-100">03 / SHARE</span>
              <h3 className="mt-3 text-xl font-bold">Send one convenient link</h3>
              <p className="mt-2 text-sm leading-6 text-indigo-50/85">
                Share the link with your intended recipients. A multi-file transfer is delivered together as a ZIP when the recipient downloads it.
              </p>
            </li>
          </ol>
        </section>

        <section id="features" aria-labelledby="features-heading" className="scroll-mt-8 border-t border-white/15 py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-100">Made for control</p>
            <h2 id="features-heading" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Features of SecureDrop</h2>
            <p className="mt-4 text-base leading-7 text-indigo-50/90">
              Everything you need to share files online with more control over how a link can be used.
            </p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-bold">Password-protected sharing</h3>
              <p className="mt-2 text-sm leading-6 text-indigo-50/85">Require a password before a recipient can download a shared transfer.</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-bold">File sharing with expiration links</h3>
              <p className="mt-2 text-sm leading-6 text-indigo-50/85">Set a date and time after which a share link is no longer available.</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-bold">Download limits</h3>
              <p className="mt-2 text-sm leading-6 text-indigo-50/85">Set a maximum number of downloads to keep access within your intended scope.</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-bold">Private file storage</h3>
              <p className="mt-2 text-sm leading-6 text-indigo-50/85">Your uploads live in a private storage bucket rather than a public file directory.</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-bold">One link for a file batch</h3>
              <p className="mt-2 text-sm leading-6 text-indigo-50/85">Share multiple files together in a single transfer that recipients can download as a ZIP.</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-bold">Custom links and file management</h3>
              <p className="mt-2 text-sm leading-6 text-indigo-50/85">Create a recognizable link name and manage your files and shares from your dashboard.</p>
            </article>
          </div>
        </section>

        <section id="security" aria-labelledby="security-heading" className="scroll-mt-8 border-t border-white/15 py-16 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-100">Privacy matters</p>
              <h2 id="security-heading" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Security and Privacy</h2>
            </div>
            <div className="space-y-4 text-base leading-7 text-indigo-50/90">
              <p>
                SecureDrop uses a private Supabase Storage bucket for uploaded files. Files are not placed in an openly browsable public bucket.
              </p>
              <p>
                Share links are checked by the SecureDrop backend. Password protection, expiration dates, and download limits apply to the link when you choose those settings.
              </p>
              <p>
                Sign in to upload and manage your files. Share links are for the recipients you give them to, so only distribute a link and its password to people you intend to have access.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="why-securedrop" className="border-t border-white/15 py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-100">Less hassle, more control</p>
            <h2 id="why-securedrop" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Why Choose SecureDrop?</h2>
            <p className="mt-4 text-base leading-7 text-indigo-50/90">
              Online file sharing should be easy to use without leaving access settings as an afterthought. SecureDrop brings private file sharing, clear link controls, and simple file management into one workflow.
            </p>
          </div>
          <ul className="mt-7 grid gap-3 text-sm font-semibold text-white sm:grid-cols-2">
            <li className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">✓ Share a batch using one convenient link</li>
            <li className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">✓ Choose a password, expiry, or download cap</li>
            <li className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">✓ Keep uploads in private storage</li>
            <li className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">✓ Manage your files and shares in one place</li>
          </ul>
        </section>

        <section aria-labelledby="faq-heading" className="border-t border-white/15 py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-100">Good to know</p>
            <h2 id="faq-heading" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Frequently Asked Questions</h2>
          </div>
          <div className="mt-8 space-y-3">
            <details className="group rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <summary className="cursor-pointer list-none pr-6 font-bold marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-100">
                What is SecureDrop?
              </summary>
              <p className="mt-3 text-sm leading-6 text-indigo-50/85">
                SecureDrop is an online file sharing platform for uploading files and sharing them through links with optional access controls.
              </p>
            </details>
            <details className="group rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <summary className="cursor-pointer list-none pr-6 font-bold marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-100">
                How many files can I include in a transfer?
              </summary>
              <p className="mt-3 text-sm leading-6 text-indigo-50/85">
                A transfer can include up to 50 files and 1 GB in total. Each individual file can be up to 100 MB. Recipients can download a multi-file transfer as a ZIP.
              </p>
            </details>
            <details className="group rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <summary className="cursor-pointer list-none pr-6 font-bold marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-100">
                Can I protect a sharing link with a password?
              </summary>
              <p className="mt-3 text-sm leading-6 text-indigo-50/85">
                Yes. Add a password when creating the link. Recipients will need it before they can download the shared files.
              </p>
            </details>
            <details className="group rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <summary className="cursor-pointer list-none pr-6 font-bold marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-100">
                Do SecureDrop links expire or have download limits?
              </summary>
              <p className="mt-3 text-sm leading-6 text-indigo-50/85">
                You can set an expiration date and a maximum number of downloads when creating a share. A link stops granting access when its configured limit is reached or it expires.
              </p>
            </details>
            <details className="group rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <summary className="cursor-pointer list-none pr-6 font-bold marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-100">
                Are uploaded files stored publicly?
              </summary>
              <p className="mt-3 text-sm leading-6 text-indigo-50/85">
                No. SecureDrop stores uploads in a private storage bucket and uses its backend to manage share access.
              </p>
            </details>
          </div>
        </section>

        <section aria-labelledby="get-started" className="border-t border-white/15 py-16 text-center sm:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-100">Your files, under control</p>
          <h2 id="get-started" className="mx-auto mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Share files with care.</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-indigo-50/90">
            Create a private transfer, choose the access settings that work for you, and share it with confidence.
          </p>
          <a href="/login" className="mt-7 inline-flex rounded-xl bg-white px-6 py-3.5 font-bold text-indigo-800 shadow-xl transition hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            Start a transfer
          </a>
        </section>

        <footer className="border-t border-white/20 py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <BrandLogo />
              <p className="mt-3 text-sm text-indigo-50/75">Private file sharing with practical access controls.</p>
            </div>
            <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-indigo-50/90">
              <a href="#how-it-works" className="transition hover:text-white">How it works</a>
              <a href="#features" className="transition hover:text-white">Features</a>
              <a href="#security" className="transition hover:text-white">Security</a>
              <a href="/login" className="transition hover:text-white">Sign in</a>
            </nav>
          </div>
          <p className="mt-7 border-t border-white/15 pt-5 text-xs text-indigo-50/65">© {new Date().getFullYear()} SecureDrop. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}

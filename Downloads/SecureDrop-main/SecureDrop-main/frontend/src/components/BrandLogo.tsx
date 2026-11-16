type BrandLogoProps = {
  tone?: 'light' | 'dark';
};

export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return <img src="/securedrop-logo.png" alt="" aria-hidden="true" className={`object-contain ${className}`} />;
}

export function BrandLogo({ tone = 'light' }: BrandLogoProps) {
  const isLight = tone === 'light';

  return (
    <a
      href="/"
      aria-label="SecureDrop home"
      className={`inline-flex items-center gap-3 font-bold tracking-tight ${isLight ? 'text-white' : 'text-slate-800'}`}
    >
      <span
        className={`grid h-10 w-10 place-items-center rounded-2xl ring-1 ${
          isLight ? 'bg-white/10 ring-white/25' : 'bg-slate-950 ring-slate-900'
        }`}
      >
        <BrandMark />
      </span>
      <span className="text-xl">SecureDrop</span>
    </a>
  );
}

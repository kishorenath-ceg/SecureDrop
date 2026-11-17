import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { downloadShare, getPublicShare, verifySharePassword } from '../services/shareService';
import { BrandLogo } from '../components/BrandLogo';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function SharePage() {
  const { token: routeToken, resource } = useParams();
  const token = routeToken ?? resource;
  const [password, setPassword] = useState('');
  const [shareInfo, setShareInfo] = useState<Awaited<ReturnType<typeof getPublicShare>>['data'] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const loadShare = async () => {
      if (!token) {
        return;
      }

      const result = await getPublicShare(token);
      if (result.success && result.data) {
        setShareInfo(result.data);
      } else {
        setStatus(result.error?.message ?? 'This sharing link is unavailable.');
      }
    };

    void loadShare();
  }, [token]);

  const handleDownload = async () => {
    if (!token) {
      setStatus('Missing share token.');
      return;
    }

    setIsChecking(true);
    setStatus(null);

    try {
      if (shareInfo?.passwordRequired) {
        const verifyResult = await verifySharePassword(token, password);
        if (!verifyResult.success) {
          setStatus(verifyResult.error?.message ?? 'Password verification failed.');
          setIsChecking(false);
          return;
        }
      }

      const result = await downloadShare(token, shareInfo?.passwordRequired ? password : undefined);
      if (!result.success) {
        setStatus(result.error?.message ?? 'Download is not permitted.');
      } else if (result.data?.downloadUrl) {
        setStatus('Download authorized. Starting your secure download…');
        window.location.href = result.data.downloadUrl;
      } else {
        setStatus('Download authorized.');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to start the secure download.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <main className="transfer-shell relative min-h-screen overflow-hidden px-5 py-10 text-slate-900 sm:px-8">
      <div aria-hidden="true" className="transfer-orb transfer-orb-one" />
      <div aria-hidden="true" className="transfer-orb transfer-orb-two" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center">
      <section className="transfer-card-3d motion-enter w-full rounded-3xl border border-white/60 bg-white/95 p-6 shadow-[0_32px_100px_rgba(22,25,87,0.28)] backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <BrandLogo tone="dark" />
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Secure download</span>
        </div>
        <h1 className="break-all text-2xl font-black tracking-tight sm:text-3xl">
          {shareInfo?.fileCount && shareInfo.fileCount > 1 ? 'Secure ZIP transfer' : shareInfo?.fileName ?? 'Secure file'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {shareInfo?.fileCount && shareInfo.fileCount > 1
            ? `${shareInfo.fileCount} files · ${formatBytes(shareInfo.sizeBytes ?? 0)} total`
            : shareInfo?.sizeBytes != null
              ? `${formatBytes(shareInfo.sizeBytes)}${shareInfo.mimeType ? ` · ${shareInfo.mimeType}` : ''}`
              : ''}
        </p>

        <div className="mt-6 space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 text-sm text-slate-700">
          <div className="flex justify-between gap-4"><span>Available until</span><span className="text-right font-semibold">{shareInfo?.expiresAt ? new Date(shareInfo.expiresAt).toLocaleString() : 'No expiration'}</span></div>
          <div className="flex justify-between gap-4"><span>Downloads</span><span className="font-semibold">{shareInfo?.downloadCount ?? 0} / {shareInfo?.downloadLimit == null ? '∞' : shareInfo.downloadLimit}</span></div>
          <div className="flex justify-between gap-4"><span>Password protection</span><span className="font-semibold">{shareInfo?.passwordRequired ? 'Enabled' : 'Disabled'}</span></div>
          <div className="flex justify-between gap-4"><span>Status</span><span className="font-semibold">{shareInfo?.status ?? 'Loading…'}</span></div>
          {shareInfo?.files && shareInfo.files.length > 1 && (
            <div className="border-t border-indigo-100 pt-3">
              <p className="mb-2 font-semibold">Included files</p>
              <ul className="max-h-40 space-y-1.5 overflow-y-auto overscroll-contain">
                {shareInfo.files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex justify-between gap-4 text-xs">
                    <span className="truncate" title={file.name}>{file.name}</span>
                    <span className="shrink-0 text-slate-500">{formatBytes(file.sizeBytes)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {shareInfo?.message && (
          <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-sm text-slate-700">
            {shareInfo.message}
          </div>
        )}

        {shareInfo?.passwordRequired && (
          <div className="mt-6">
            <label htmlFor="share-password" className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
            <input
              id="share-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter the file password"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {shareInfo?.fileCount && shareInfo.fileCount > 1
            ? `Download all ${shareInfo.fileCount} files together in one ZIP archive.`
            : shareInfo?.fileName
              ? `Download ${shareInfo.fileName} securely.`
              : 'This file is shared securely.'}
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={isChecking || !token || !shareInfo?.active}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-indigo-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isChecking ? 'Preparing secure download…' : shareInfo?.fileCount && shareInfo.fileCount > 1 ? 'Download ZIP' : 'Download file'}
        </button>

        {status && <div role="status" className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{status}</div>}
        <p className="mt-4 text-center text-xs text-slate-400">Shared privately with SecureDrop</p>
      </section>
      </div>
    </main>
  );
}

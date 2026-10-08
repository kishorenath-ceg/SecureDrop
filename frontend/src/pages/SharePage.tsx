import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { downloadShare, getPublicShare, verifySharePassword } from '../services/shareService';

export function SharePage() {
  const { token } = useParams();
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
        setStatus('Download authorized. Redirecting to secure file...');
        window.location.href = result.data.downloadUrl;
      } else {
        setStatus('Download authorized.');
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-sky-950/20">
        <p className="text-sm uppercase tracking-[0.2em] text-sky-300">Secure download</p>
        <h1 className="mt-3 text-3xl font-semibold">Project Report.pdf</h1>
        <p className="mt-2 text-sm text-slate-400">12.4 MB · PDF Document</p>

        <div className="mt-6 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-300">
          <div>Available until: {shareInfo?.expiresAt ? new Date(shareInfo.expiresAt).toLocaleString() : 'No expiration set'}</div>
          <div>Downloads: {shareInfo?.downloadCount ?? 0} / {shareInfo?.downloadLimit ?? 0}</div>
          <div>Password protection: {shareInfo?.passwordRequired ? 'enabled' : 'disabled'}</div>
          <div>Status: {shareInfo?.status ?? 'loading...'}</div>
        </div>

        {shareInfo?.passwordRequired && (
          <div className="mt-6">
            <label className="mb-2 block text-sm text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter the file password"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500"
            />
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-slate-300">
          Here is the final project report.
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={isChecking || !token}
          className="mt-6 w-full rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isChecking ? 'Checking access...' : 'Download File'}
        </button>

        {status && <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200">{status}</div>}
        <p className="mt-4 text-center text-xs text-slate-500">Share token: {token}</p>
      </div>
    </main>
  );
}

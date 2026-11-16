import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { deleteDashboardFile, getDashboardFiles, getDashboardStats, type DashboardFileItem, type DashboardStat } from '../services/dashboardService';
import { signOut } from '../services/authService';
import { getCurrentProfile } from '../services/profileService';
import { BrandLogo } from '../components/BrandLogo';

const initialStats: DashboardStat[] = [
  { label: 'Total files', value: '0' },
  { label: 'Active links', value: '0' },
  { label: 'Expired links', value: '0' },
  { label: 'Total downloads', value: '0' },
  { label: 'Storage used', value: '0 B' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(initialStats);
  const [files, setFiles] = useState<DashboardFileItem[]>([]);
  const [displayName, setDisplayName] = useState('SecureDrop user');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fileToDelete, setFileToDelete] = useState<DashboardFileItem | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [qrFile, setQrFile] = useState<DashboardFileItem | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const [statsResult, filesResult, profileResult] = await Promise.all([
          getDashboardStats(),
          getDashboardFiles(),
          getCurrentProfile(),
        ]);

        if (!active) return;

        if (profileResult.success && profileResult.data?.displayName) {
          setDisplayName(profileResult.data.displayName);
        }

        if (statsResult.success && statsResult.data) {
          setStats([
            { label: 'Total files', value: String(statsResult.data.totalFiles) },
            { label: 'Active links', value: String(statsResult.data.activeLinks) },
            { label: 'Expired links', value: String(statsResult.data.expiredLinks) },
            { label: 'Total downloads', value: String(statsResult.data.totalDownloads) },
            { label: 'Storage used', value: statsResult.data.storageUsed },
          ]);
        } else if (!statsResult.success) {
          setError(statsResult.error?.message ?? 'Unable to load dashboard statistics.');
        }

        if (filesResult.success) {
          setFiles(filesResult.data?.files ?? []);
        } else {
          setError(filesResult.error?.message ?? 'Unable to load your files.');
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const visibleFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? files.filter((file) => file.name.toLowerCase().includes(query)) : files;
  }, [files, search]);

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    const file = fileToDelete;
    setDeletingFileId(file.id);
    setDeleteError(null);

    try {
      const result = await deleteDashboardFile(file.id);
      if (!result.success || !result.data?.deleted) {
        setDeleteError(
          result.error
            ? `${result.error.code}: ${result.error.message}`
            : 'The server did not confirm deletion. Refresh the dashboard and try again.'
        );
        return;
      }

      setFiles((currentFiles) => currentFiles.filter((currentFile) => currentFile.id !== file.id));
      setFileToDelete(null);

      try {
        const statsResult = await getDashboardStats();
        if (statsResult.success && statsResult.data) {
          setStats([
            { label: 'Total files', value: String(statsResult.data.totalFiles) },
            { label: 'Active links', value: String(statsResult.data.activeLinks) },
            { label: 'Expired links', value: String(statsResult.data.expiredLinks) },
            { label: 'Total downloads', value: String(statsResult.data.totalDownloads) },
            { label: 'Storage used', value: statsResult.data.storageUsed },
          ]);
        } else {
          setError('File deleted successfully, but dashboard statistics could not be refreshed.');
        }
      } catch {
        setError('File deleted successfully, but dashboard statistics could not be refreshed.');
      }
    } catch (deleteRequestError) {
      setDeleteError(
        deleteRequestError instanceof Error ? deleteRequestError.message : 'The file could not be deleted.'
      );
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleCopyLink = async (file: DashboardFileItem) => {
    if (file.shareLink === 'Not shared') return;

    try {
      await navigator.clipboard.writeText(file.shareLink);
      setCopiedFileId(file.id);
    } catch {
      setError('Clipboard access is unavailable. Open the link and copy it from the address bar.');
    }
  };

  return (
    <main className="transfer-shell relative min-h-screen overflow-hidden px-5 pb-12 pt-6 text-slate-900 sm:px-8">
      <div aria-hidden="true" className="transfer-orb transfer-orb-one" />
      <div aria-hidden="true" className="transfer-orb transfer-orb-two" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <BrandLogo />
          <div className="flex items-center gap-3">
            <a href="/upload" className="rounded-full bg-white px-4 py-2.5 text-sm font-bold text-indigo-800 shadow-lg transition hover:shadow-xl">
              New transfer
            </a>
            <button
              type="button"
              onClick={async () => {
                const result = await signOut();
                if (result.success) {
                  navigate('/login');
                } else {
                  setError(result.error?.message ?? 'Unable to sign out.');
                }
              }}
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="transfer-card-3d motion-enter mt-10 rounded-[2rem] border border-white/25 bg-white/10 p-6 text-white shadow-xl backdrop-blur-lg sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">Your workspace</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Welcome, {displayName}</h1>
              <p className="mt-2 text-sm text-indigo-50/90">Manage your files and keep every share under control.</p>
            </div>
            <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90">
              Private workspace
            </span>
          </div>
        </section>

        {error && (
          <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="font-bold underline underline-offset-2">
              Dismiss
            </button>
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat, index) => (
            <article key={stat.label} className="transfer-card-3d motion-enter rounded-2xl border border-white/70 bg-white/95 p-5 shadow-lg shadow-indigo-950/10" style={{ animationDelay: `${index * 55}ms` }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  {['▤', '↗', '◷', '↓', '◫'][index]}
                </span>
              </div>
              <p className="mt-4 text-2xl font-black tracking-tight text-slate-900">{stat.value}</p>
            </article>
          ))}
        </section>

        <section className="transfer-card-3d mt-6 rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-[0_24px_70px_rgba(22,25,87,0.2)] sm:p-7">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">File library</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Your files</h2>
              <p className="mt-1 text-sm text-slate-500">Delete a file to remove its stored content and associated share links.</p>
            </div>
            <label className="block w-full sm:max-w-xs">
              <span className="sr-only">Search files</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search files..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </label>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[900px] divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-indigo-50/70">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-600">File</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Uploaded</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Share link</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Expires</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Downloads</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Status</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">Loading your files…</td>
                  </tr>
                ) : visibleFiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <p className="font-semibold text-slate-700">{search ? 'No matching files' : 'No files uploaded yet'}</p>
                      <p className="mt-1 text-sm text-slate-500">{search ? 'Try another file name.' : 'Start a transfer to see it here.'}</p>
                      {!search && <a href="/upload" className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">Upload your first file</a>}
                    </td>
                  </tr>
                ) : (
                  visibleFiles.map((file) => (
                    <tr key={file.id} className="transition hover:bg-indigo-50/40">
                      <td className="max-w-56 px-4 py-4">
                        <p className="truncate font-bold text-slate-800" title={file.name}>{file.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{file.size}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">{file.uploadDate}</td>
                      <td className="max-w-56 px-4 py-4">
                        {file.bundleLabel ? (
                          <span className="text-xs font-medium text-indigo-600">{file.bundleLabel}</span>
                        ) : file.shareLink === 'Not shared' ? (
                          <span className="text-slate-400">Not shared</span>
                        ) : (
                          <a href={file.shareLink} target="_blank" rel="noreferrer" className="block max-w-[260px] break-all text-xs font-medium leading-5 text-indigo-700 underline decoration-indigo-200 underline-offset-4" title={file.shareLink}>
                            {file.shareLink}
                          </a>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">{file.expiration}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">{file.downloads}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${file.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : file.status === 'Included in ZIP' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                          {file.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {file.shareLink !== 'Not shared' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setQrFile(file)}
                                className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                              >
                                QR
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCopyLink(file)}
                                className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                              >
                                {copiedFileId === file.id ? 'Copied' : 'Copy'}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setFileToDelete(file);
                            }}
                            className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">{visibleFiles.length} {visibleFiles.length === 1 ? 'file' : 'files'}</p>
        </section>
      </div>

      {fileToDelete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-file-title"
            aria-describedby="delete-file-description"
            className="transfer-card-3d motion-enter w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-7"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-xl font-black text-rose-600">!</span>
            <h2 id="delete-file-title" className="mt-5 text-xl font-bold text-slate-900">Delete this file permanently?</h2>
            <p id="delete-file-description" className="mt-2 text-sm leading-6 text-slate-600">
              This removes the file from private storage and deletes its database record and associated share links. This action cannot be undone.
            </p>
            <p className="mt-4 break-all rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">{fileToDelete.name}</p>
            {deleteError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{deleteError}</p>}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deletingFileId !== null}
                onClick={() => setFileToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingFileId !== null}
                onClick={() => void handleDeleteFile()}
                className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
              >
                {deletingFileId ? 'Deleting file…' : 'Delete permanently'}
              </button>
            </div>
          </section>
        </div>
      )}

      {qrFile && qrFile.shareLink !== 'Not shared' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="file-qr-title"
            className="transfer-card-3d motion-enter w-full max-w-sm rounded-3xl border border-white/70 bg-white p-6 text-center shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 text-left">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500">{qrFile.bundleCount && qrFile.bundleCount > 1 ? 'Share this ZIP transfer' : 'Share this file'}</p>
                <h2 id="file-qr-title" className="mt-1 truncate text-lg font-bold text-slate-900" title={qrFile.name}>
                  {qrFile.bundleCount && qrFile.bundleCount > 1 ? `${qrFile.bundleCount} files as one ZIP` : qrFile.name}
                </h2>
              </div>
              <button type="button" onClick={() => setQrFile(null)} aria-label="Close QR code" className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                ×
              </button>
            </div>
            <div className="mx-auto mt-5 inline-flex rounded-2xl border border-slate-100 bg-white p-3 shadow-lg shadow-indigo-100">
              <QRCodeSVG value={qrFile.shareLink} size={196} level="M" marginSize={2} title={qrFile.bundleCount && qrFile.bundleCount > 1 ? 'QR code for the ZIP transfer' : `QR code for ${qrFile.name}`} />
            </div>
            <a href={qrFile.shareLink} target="_blank" rel="noreferrer" className="mt-4 block break-all rounded-xl bg-indigo-50 p-3 text-left text-xs font-medium text-indigo-800 underline decoration-indigo-200 underline-offset-2">
              {qrFile.shareLink}
            </a>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => void handleCopyLink(qrFile)} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">
                {copiedFileId === qrFile.id ? 'Copied' : 'Copy link'}
              </button>
              <button type="button" onClick={() => setQrFile(null)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

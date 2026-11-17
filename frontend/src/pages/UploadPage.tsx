import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createShareLink } from '../services/shareService';
import { uploadFile } from '../services/fileService';
import { BrandLogo } from '../components/BrandLogo';

type UploadState = 'queued' | 'uploading' | 'uploaded' | 'failed';

type TransferFile = {
  id: string;
  file: File;
  state: UploadState;
  progress: number;
  uploadedFileId?: string;
  error?: string;
};

const MAX_TRANSFER_FILES = 50;
const MAX_TRANSFER_SIZE_BYTES = 1024 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function UploadPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [files, setFiles] = useState<TransferFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isCreatingLinks, setIsCreatingLinks] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [customSlug, setCustomSlug] = useState('');
  const [password, setPassword] = useState('');
  const [maxDownloads, setMaxDownloads] = useState('10');
  const [message, setMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const nextFileId = useRef(0);

  const updateFile = (fileId: string, updates: Partial<TransferFile>) => {
    setFiles((currentFiles) =>
      currentFiles.map((item) => (item.id === fileId ? { ...item, ...updates } : item))
    );
  };

  const addFiles = (selectedFiles: FileList | File[]) => {
    if (isUploading || isCreatingLinks || shareUrl) return;
    const additions: TransferFile[] = [];
    let remainingSize = files.reduce((total, item) => total + item.file.size, 0);
    let skippedCount = 0;

    for (const file of Array.from(selectedFiles)) {
      if (files.length + additions.length >= MAX_TRANSFER_FILES || remainingSize + file.size > MAX_TRANSFER_SIZE_BYTES) {
        skippedCount += 1;
        continue;
      }

      additions.push({
        id: `${Date.now()}-${nextFileId.current++}`,
        file,
        state: 'queued',
        progress: 0,
      });
      remainingSize += file.size;
    }

    if (additions.length === 0) {
      if (skippedCount > 0) setStatus(`The transfer is limited to ${MAX_TRANSFER_FILES} files and 1 GB total.`);
      return;
    }
    setFiles((currentFiles) => [...currentFiles, ...additions]);
    setActiveTab('upload');
    setStatus(
      `${additions.length} file${additions.length === 1 ? '' : 's'} added${skippedCount ? `; ${skippedCount} skipped because the transfer limit was reached` : ''}.`
    );
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const handleUploadFiles = async () => {
    const pendingFiles = files.filter((item) => item.state === 'queued' || item.state === 'failed');
    if (pendingFiles.length === 0) {
      setStatus('Add files to the transfer before uploading.');
      return;
    }

    setIsUploading(true);
    let uploadedCount = 0;
    let failedCount = 0;

    try {
      for (const [index, item] of pendingFiles.entries()) {
        setStatus(`Uploading file ${index + 1} of ${pendingFiles.length}: ${item.file.name}`);
        updateFile(item.id, { state: 'uploading', progress: 0, error: undefined });

        try {
          const result = await uploadFile(item.file, (progress) => updateFile(item.id, { progress }));
          if (result.success) {
            updateFile(item.id, {
              state: 'uploaded',
              progress: 100,
              uploadedFileId: result.data.id,
              error: undefined,
            });
            uploadedCount += 1;
          } else {
            updateFile(item.id, { state: 'failed', error: result.error.message });
            failedCount += 1;
          }
        } catch (error) {
          updateFile(item.id, {
            state: 'failed',
            error: error instanceof Error ? error.message : 'Upload failed due to a network error.',
          });
          failedCount += 1;
        }
      }

      setStatus(
        failedCount > 0
          ? `Uploaded ${uploadedCount} file${uploadedCount === 1 ? '' : 's'}; ${failedCount} failed. Retry failed files or continue with the successful uploads.`
          : `Uploaded ${uploadedCount} file${uploadedCount === 1 ? '' : 's'} successfully.`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateShareLink = async () => {
    const uploadedFiles = files.filter(
      (item): item is TransferFile & { uploadedFileId: string } =>
        item.state === 'uploaded' && Boolean(item.uploadedFileId)
    );

    if (uploadedFiles.length === 0 || uploadedFiles.length !== files.length) {
      setStatus('Upload or remove every queued/failed file before creating the transfer link.');
      return;
    }

    setIsCreatingLinks(true);
    setStatus('Creating one secure link for your complete transfer…');

    try {
      const result = await createShareLink({
        fileIds: uploadedFiles.map((item) => item.uploadedFileId),
        customSlug: customSlug.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        maxDownloads: Number(maxDownloads) || undefined,
        password: password || undefined,
        message: message || undefined,
      });

      if (result.success && result.data?.shareUrl) {
        setShareUrl(result.data.shareUrl);
        setCopied(false);
        setStatus(`One secure link now includes all ${uploadedFiles.length} file${uploadedFiles.length === 1 ? '' : 's'}.`);
      } else {
        setStatus(result.error?.message ?? 'Unable to create the secure transfer link.');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to create the secure transfer link.');
    } finally {
      setIsCreatingLinks(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setStatus('Secure transfer link copied to clipboard.');
    } catch {
      setStatus('Clipboard access is unavailable. Select and copy the share link.');
    }
  };

  const handleRemovePendingFile = (fileId: string) => {
    setFiles((currentFiles) => currentFiles.filter((item) => item.id !== fileId || item.state === 'uploaded'));
  };

  const clearPendingFiles = () => {
    setFiles((currentFiles) => currentFiles.filter((item) => item.state === 'uploaded'));
    setStatus('Queued files cleared. Uploaded files remain in your transfer.');
  };

  const startNewTransfer = () => {
    setFiles([]);
    setShareUrl(null);
    setCopied(false);
    setShowQr(false);
    setActiveTab('upload');
    setStatus('Ready to create a new transfer.');
  };

  const pendingCount = files.filter((item) => item.state === 'queued' || item.state === 'failed').length;
  const uploadedFiles = files.filter((item) => item.state === 'uploaded');
  const totalSize = files.reduce((total, item) => total + item.file.size, 0);
  const canCreateShareLink = files.length > 0 && uploadedFiles.length === files.length && !shareUrl;
  const shareOptionsDisabled = Boolean(shareUrl) || isCreatingLinks;

  return (
    <main className="transfer-shell relative min-h-screen overflow-hidden px-4 pb-8 pt-5 text-slate-900 sm:px-8">
      <div aria-hidden="true" className="transfer-orb transfer-orb-one" />
      <div aria-hidden="true" className="transfer-orb transfer-orb-two" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
        <BrandLogo />
        <a href="/dashboard" className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:border-white/60 hover:bg-white/20">
          Dashboard
        </a>
      </header>

      <section className="relative z-10 mx-auto mt-8 max-w-7xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">Private file sharing</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">One transfer. One secure link.</h1>
          </div>
          <p className="max-w-md text-sm leading-6 text-indigo-50/90">Bring your files together, set the access rules, and share one QR-ready link. Recipients get the whole batch as a ZIP.</p>
        </div>

        <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="transfer-card-3d motion-enter relative overflow-hidden rounded-3xl border border-white/70 bg-white/95 p-5 shadow-[0_28px_90px_rgba(22,25,87,0.28)] backdrop-blur-xl sm:p-7">
            <div role="tablist" aria-label="Transfer steps" className="mb-4 grid grid-cols-2 rounded-xl bg-indigo-50 p-1">
              <button
                id="upload-tab"
                type="button"
                role="tab"
                aria-selected={activeTab === 'upload'}
                aria-controls="upload-panel"
                onClick={() => setActiveTab('upload')}
                className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                  activeTab === 'upload' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Send files
              </button>
              <button
                id="link-tab"
                type="button"
                role="tab"
                aria-selected={activeTab === 'link'}
                aria-controls="link-panel"
                onClick={() => setActiveTab('link')}
                className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                  activeTab === 'link' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Create one link
              </button>
            </div>

            {activeTab === 'upload' ? (
              <div id="upload-panel" role="tabpanel" aria-labelledby="upload-tab" className="flex min-h-[390px] flex-col justify-between">
                <div className="transfer-inner-card rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6 sm:p-7">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-black text-indigo-600 shadow-md shadow-indigo-100">01</span>
                  <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">Build your transfer</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    Add your files in the queue beside this panel. SecureDrop uploads them to private storage, then bundles them behind one share link.
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white bg-white/80 p-3 shadow-sm">
                      <p className="text-lg font-black text-indigo-700">{files.length}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">files selected</p>
                    </div>
                    <div className="rounded-xl border border-white bg-white/80 p-3 shadow-sm">
                      <p className="truncate text-lg font-black text-cyan-700">{formatBytes(totalSize)}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">total transfer size</p>
                    </div>
                  </div>
                  <p className="mt-5 text-xs font-semibold text-slate-500">Up to 50 files · 100 MB each · 1 GB per transfer</p>
                </div>
                <button
                  type="button"
                  onClick={handleUploadFiles}
                  disabled={pendingCount === 0 || isUploading || Boolean(shareUrl)}
                  className="transfer-action-button mt-5 w-full rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploading ? 'Uploading files…' : pendingCount > 0 ? `Upload ${pendingCount} file${pendingCount === 1 ? '' : 's'}` : 'All files uploaded'}
                </button>
              </div>
            ) : (
              <div id="link-panel" role="tabpanel" aria-labelledby="link-tab" className="min-h-[390px]">
                <div className="mb-5 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-black text-violet-600 shadow-md shadow-violet-100">02</span>
                  <h2 className="mt-4 text-xl font-bold text-slate-900">Set link protection</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">One password, expiration, and download limit will protect the complete ZIP transfer.</p>
                </div>
                {files.length === 0 && (
                  <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    Add and upload files before creating the secure transfer link.
                  </p>
                )}
                {files.length > 0 && uploadedFiles.length !== files.length && (
                  <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    Upload or remove all queued and failed files before sharing the batch.
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Expiration
                    <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} disabled={shareOptionsDisabled} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Download limit
                    <input type="number" min={1} max={10000} value={maxDownloads} onChange={(event) => setMaxDownloads(event.target.value)} disabled={shareOptionsDisabled} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500" />
                  </label>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      Link name
                      <input value={customSlug} onChange={(event) => setCustomSlug(event.target.value)} disabled={shareOptionsDisabled} placeholder="e.g. team-transfer" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500" />
                    </label>
                    <p className="mt-1 text-xs font-normal text-slate-500">Used in your link: /SecureDrop/link-name</p>
                  </div>
                  <label className="text-xs font-semibold text-slate-700">
                    Password
                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={shareOptionsDisabled} placeholder="8+ characters" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                    Note for recipients
                    <textarea value={message} onChange={(event) => setMessage(event.target.value)} disabled={shareOptionsDisabled} rows={2} placeholder="Optional" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500" />
                  </label>
                </div>

                {!shareUrl ? (
                  <button
                    type="button"
                    onClick={handleCreateShareLink}
                    disabled={isCreatingLinks || !canCreateShareLink}
                    className="transfer-action-button mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreatingLinks ? 'Creating secure link…' : 'Create one secure link'}
                  </button>
                ) : (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Transfer link ready</p>
                      <p className="mt-0.5 text-xs text-emerald-700">One link for all {uploadedFiles.length} files.</p>
                    </div>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-emerald-600 shadow-sm">✓</span>
                  </div>
                )}
              </div>
            )}

            {status && <p role="status" className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{status}</p>}
          </section>

          <aside className="transfer-card-3d motion-enter motion-enter-delay relative overflow-hidden rounded-3xl border border-white/70 bg-white/95 p-5 shadow-[0_28px_90px_rgba(22,25,87,0.28)] backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500">Your transfer</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Files in this transfer</h2>
              </div>
              <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {files.length ? `${files.length} file${files.length === 1 ? '' : 's'} · ${formatBytes(totalSize)}` : 'No files'}
              </span>
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                if (!isUploading && !shareUrl && !isCreatingLinks) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`mt-4 rounded-2xl border-2 border-dashed p-4 text-center transition ${
                isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-200 bg-indigo-50/50 hover:border-indigo-400'
              }`}
            >
              <input
                id="secure-file-input"
                type="file"
                multiple
                className="sr-only"
                disabled={isUploading || isCreatingLinks || Boolean(shareUrl)}
                onChange={handleInput}
                aria-label="Choose multiple files"
              />
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-white text-xl text-indigo-600 shadow-md shadow-indigo-100">⇧</span>
              <p className="mt-2 text-sm font-bold text-slate-800">{shareUrl ? 'Transfer is ready to share' : files.length ? 'Add more files' : 'Drop files to get started'}</p>
              <p className="mt-0.5 text-xs text-slate-500">{shareUrl ? 'Start a new transfer to upload another batch.' : 'Drop multiple files here or browse · 100 MB each · 1 GB total'}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <label htmlFor="secure-file-input" className={`inline-flex rounded-lg bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-100 transition hover:bg-indigo-100 ${isUploading || isCreatingLinks || shareUrl ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>
                  {files.length ? 'Add more files' : 'Choose files'}
                </label>
                <button
                  type="button"
                  onClick={clearPendingFiles}
                  disabled={isUploading || isCreatingLinks || Boolean(shareUrl) || pendingCount === 0}
                  className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear pending
                </button>
                {shareUrl && (
                  <button type="button" onClick={startNewTransfer} className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50">
                    Start new transfer
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 max-h-[380px] space-y-2 overflow-y-auto overscroll-contain pr-1">
              {files.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-600">Your files will appear here</p>
                  <p className="mt-1 text-xs text-slate-400">Select multiple files or drag them into this panel.</p>
                </div>
              ) : (
                files.map((item) => (
                  <div key={item.id} className="transfer-file-row rounded-xl border border-slate-200 bg-white p-3 transition">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-50 to-cyan-50 text-lg text-indigo-600">
                        {item.file.type.startsWith('image/') ? '▧' : '▤'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800" title={item.file.name}>{item.file.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{formatBytes(item.file.size)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${
                        item.state === 'uploaded' ? 'bg-emerald-50 text-emerald-700' :
                        item.state === 'failed' ? 'bg-rose-50 text-rose-700' :
                        item.state === 'uploading' ? 'bg-indigo-50 text-indigo-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {item.state === 'uploaded' ? 'Ready' : item.state === 'failed' ? 'Failed' : item.state === 'uploading' ? `${item.progress}%` : 'Queued'}
                      </span>
                      {item.state !== 'uploaded' && !shareUrl && (
                        <button
                          type="button"
                          onClick={() => handleRemovePendingFile(item.id)}
                          disabled={isUploading || isCreatingLinks}
                          aria-label={`Remove ${item.file.name}`}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {item.state === 'uploading' && (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-[width] duration-300" style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                    {item.error && <p role="alert" className="mt-2 break-words text-xs text-rose-600">{item.error}</p>}
                  </div>
                ))
              )}
            </div>

            {shareUrl ? (
              <div className="motion-enter mt-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="grid h-[132px] w-[132px] shrink-0 place-items-center rounded-2xl border border-white bg-white p-2 shadow-md shadow-emerald-100">
                    {showQr ? (
                      <QRCodeSVG value={shareUrl} size={116} level="M" marginSize={1} title="QR code for the complete transfer" />
                    ) : (
                      <span aria-hidden="true" className="text-6xl font-light text-indigo-300">▦</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Your one secure link</p>
                    <a href={shareUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm font-semibold leading-5 text-indigo-700 underline decoration-indigo-200 underline-offset-4">
                      {shareUrl}
                    </a>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void handleCopyLink()} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-800">
                        {copied ? 'Copied' : 'Copy link'}
                      </button>
                      <button type="button" onClick={() => setShowQr((current) => !current)} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50">
                        {showQr ? 'Hide QR' : 'Show QR'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-indigo-50/80 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">🔒</span>
                <div>
                  <p className="text-xs font-bold text-slate-700">Private until you share</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">All selected files will be delivered together through one protected ZIP link.</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

    </main>
  );
}

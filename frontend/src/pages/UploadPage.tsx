import { ChangeEvent, DragEvent, useState } from 'react';
import { createShareLink } from '../services/shareService';
import { uploadFile } from '../services/fileService';

export function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [customSlug, setCustomSlug] = useState('');
  const [password, setPassword] = useState('');
  const [maxDownloads, setMaxDownloads] = useState('10');
  const [message, setMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const onFileSelected = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setStatus(`Selected: ${file.name}`);
    setShareUrl(null);
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    onFileSelected(event.target.files?.[0] ?? null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    onFileSelected(event.dataTransfer.files?.[0] ?? null);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setStatus('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setStatus('Uploading...');

    const result = await uploadFile(selectedFile);

    if (result.success) {
      setUploadedFileId(result.data?.id ?? null);
      setStatus(`Upload successful: ${selectedFile.name}`);
      setShareUrl(null);
    } else {
      setUploadedFileId(null);
      setStatus(result.error?.message ?? 'Upload failed.');
    }

    setIsUploading(false);
  };

  const handleCreateShareLink = async () => {
    if (!selectedFile) {
      setStatus('Upload a file before creating a share link.');
      return;
    }

    setIsCreatingLink(true);
    setStatus('Creating secure share link...');

    const result = await createShareLink({
      fileId: uploadedFileId ?? undefined,
      customSlug: customSlug.trim() || undefined,
      expiresAt: expiresAt || undefined,
      maxDownloads: Number(maxDownloads) || undefined,
      password: password || undefined,
      message: message || undefined,
    });

    if (result.success && result.data?.shareUrl) {
      setShareUrl(result.data.shareUrl);
      setStatus('Share link created successfully.');
    } else {
      setStatus(result.error?.message ?? 'Unable to create share link.');
    }

    setIsCreatingLink(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-sky-950/20">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-300">Upload</p>
          <h1 className="mt-2 text-3xl font-semibold">Secure file upload</h1>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
            isDragging ? 'border-sky-500 bg-sky-500/5' : 'border-slate-700 bg-slate-950/80'
          }`}
        >
          <div className="text-lg font-medium">{selectedFile ? selectedFile.name : 'Drop your file here'}</div>
          <div className="mt-2 text-sm text-slate-400">
            {selectedFile
              ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB · ${selectedFile.type || 'Unknown type'}`
              : 'or browse from your device'}
          </div>
          <label className="mt-6 inline-flex cursor-pointer rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700">
            Browse Files
            <input type="file" className="hidden" onChange={handleInput} />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading}
            className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Upload file'}
          </button>
          <div className="text-sm text-slate-400">Maximum file size: 100 MB</div>
        </div>

        {selectedFile && (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <h2 className="text-lg font-semibold">Share settings</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Custom slug
                <input
                  value={customSlug}
                  onChange={(event) => setCustomSlug(event.target.value)}
                  placeholder="project-report"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-sky-500"
                />
              </label>

              <label className="block text-sm text-slate-300">
                Expiration
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-sky-500"
                />
              </label>

              <label className="block text-sm text-slate-300">
                Max downloads
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={maxDownloads}
                  onChange={(event) => setMaxDownloads(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-sky-500"
                />
              </label>

              <label className="block text-sm text-slate-300">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-sky-500"
                />
              </label>
            </div>

            <label className="mt-4 block text-sm text-slate-300">
              Message
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                placeholder="Optional note shown to recipients"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-sky-500"
              />
            </label>

            <button
              type="button"
              onClick={handleCreateShareLink}
              disabled={isCreatingLink}
              className="mt-5 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingLink ? 'Creating link...' : 'Create secure link'}
            </button>

            {shareUrl && (
              <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                <div className="font-medium">Public share URL</div>
                <a href={shareUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-sky-300 underline">
                  {shareUrl}
                </a>
              </div>
            )}
          </div>
        )}

        {status && <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">{status}</div>}
      </div>
    </main>
  );
}

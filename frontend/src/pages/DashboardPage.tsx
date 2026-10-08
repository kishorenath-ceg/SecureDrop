import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardFiles, getDashboardStats } from '../services/dashboardService';
import { signOut } from '../services/authService';
import { getCurrentProfile } from '../services/profileService';

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { label: 'Total files', value: '0' },
    { label: 'Active links', value: '0' },
    { label: 'Expired links', value: '0' },
    { label: 'Total downloads', value: '0' },
    { label: 'Storage used', value: '0 B' },
  ]);
  const [files, setFiles] = useState<any[]>([]);
  const [displayName, setDisplayName] = useState('SecureDrop user');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [statsResult, filesResult, profileResult] = await Promise.all([
          getDashboardStats(),
          getDashboardFiles(),
          getCurrentProfile(),
        ]);

        if (profileResult.success && profileResult.data?.displayName) {
          setDisplayName(profileResult.data.displayName);
        }

        if (statsResult.success) {
          setStats([
            { label: 'Total files', value: String(statsResult.data?.totalFiles ?? 0) },
            { label: 'Active links', value: String(statsResult.data?.activeLinks ?? 0) },
            { label: 'Expired links', value: String(statsResult.data?.expiredLinks ?? 0) },
            { label: 'Total downloads', value: String(statsResult.data?.totalDownloads ?? 0) },
            { label: 'Storage used', value: statsResult.data?.storageUsed ?? '0 B' },
          ]);
        }

        if (filesResult.success) {
          setFiles(filesResult.data?.files ?? []);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.');
      }
    };

    void loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-sky-300">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold">Welcome, {displayName}</h1>
          </div>
          <button
            type="button"
            onClick={async () => {
              const result = await signOut();
              if (result.success) {
                navigate('/login');
                return;
              }
              window.location.href = '/login';
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-500"
          >
            Sign out
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="text-sm text-slate-400">{stat.label}</div>
              <div className="mt-3 text-2xl font-bold text-sky-300">{stat.value}</div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Files</h2>
            <a href="/upload" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950">
              Upload
            </a>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-950">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-300">Name</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Size</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Upload date</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Link</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Expiration</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Downloads</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                      No files uploaded yet.
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr key={file.id}>
                      <td className="px-4 py-3">{file.name}</td>
                      <td className="px-4 py-3">{file.size}</td>
                      <td className="px-4 py-3">{file.uploadDate}</td>
                      <td className="px-4 py-3 text-sky-300">{file.shareLink}</td>
                      <td className="px-4 py-3">{file.expiration}</td>
                      <td className="px-4 py-3">{file.downloads}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                          {file.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 text-xs">
                          {file.actions?.map((action: string) => (
                            <button
                              key={action}
                              type="button"
                              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 hover:border-sky-500"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

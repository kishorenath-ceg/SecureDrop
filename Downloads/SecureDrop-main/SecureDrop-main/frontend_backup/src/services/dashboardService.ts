import { apiFetch } from '../lib/api';

export type DashboardStat = {
  label: string;
  value: string;
};

export type DashboardFileItem = {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  shareLink: string;
  bundleLabel: string | null;
  bundleCount: number | null;
  expiration: string;
  downloads: string;
  status: string;
};

export async function getDashboardStats() {
  return apiFetch<{
    totalFiles: number;
    activeLinks: number;
    expiredLinks: number;
    totalDownloads: number;
    storageUsed: string;
  }>('/api/dashboard/stats');
}

export async function getDashboardFiles() {
  return apiFetch<{ files: DashboardFileItem[] }>('/api/dashboard/files');
}

export async function deleteDashboardFile(fileId: string) {
  return apiFetch<{ deleted: boolean }>(`/api/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
  });
}

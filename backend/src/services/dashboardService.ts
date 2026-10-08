export function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${Number(value.toFixed(1))} ${units[unitIndex]}`;
}

export function summarizeDashboard({
  files,
  shareLinks,
}: {
  files: Array<{ sizeBytes?: number | string | null }>;
  shareLinks: Array<{
    isActive?: boolean;
    isRevoked?: boolean;
    expiresAt?: string | null;
    downloadCount?: number;
    maxDownloads?: number | null;
  }>;
}) {
  const totalFiles = files.length;
  const storageUsedBytes = files.reduce((sum, file) => {
    const value = Number(file.sizeBytes ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const activeLinks = shareLinks.filter((link) => {
    const expired = link.expiresAt ? new Date(link.expiresAt).getTime() <= Date.now() : false;
    return Boolean(link.isActive) && !Boolean(link.isRevoked) && !expired;
  }).length;

  const expiredLinks = shareLinks.filter((link) => {
    const expired = link.expiresAt ? new Date(link.expiresAt).getTime() <= Date.now() : false;
    return Boolean(link.isRevoked) || !Boolean(link.isActive) || expired;
  }).length;

  const totalDownloads = shareLinks.reduce((sum, link) => sum + Number(link.downloadCount ?? 0), 0);

  return {
    totalFiles,
    activeLinks,
    expiredLinks,
    totalDownloads,
    storageUsed: formatBytes(storageUsedBytes),
  };
}

export function buildDashboardStats({
  totalFiles,
  activeLinks,
  expiredLinks,
  totalDownloads,
  storageUsedBytes,
}: {
  totalFiles: number;
  activeLinks: number;
  expiredLinks: number;
  totalDownloads: number;
  storageUsedBytes: number;
}) {
  return {
    totalFiles,
    activeLinks,
    expiredLinks,
    totalDownloads,
    storageUsed: formatBytes(storageUsedBytes),
  };
}

import { apiFetch } from '../lib/api';

export type ShareLinkConfig = {
  fileId?: string;
  customSlug?: string;
  expiresAt?: string;
  maxDownloads?: number;
  password?: string;
  message?: string;
};

export type ShareLinkResponse = {
  id: string;
  token: string;
  fileId: string | null;
  shareUrl: string;
  customSlug: string | null;
  expiresAt: string | null;
  maxDownloads: number | null;
  passwordProtected: boolean;
  message: string | null;
};

export async function createShareLink(payload: ShareLinkConfig) {
  return apiFetch<ShareLinkResponse>('/api/share-links', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type PublicShareStatus = {
  token: string;
  active: boolean;
  expired: boolean;
  passwordRequired: boolean;
  downloadLimit: number;
  downloadCount: number;
  expiresAt: string | null;
  status: string;
};

export async function getPublicShare(token: string) {
  return apiFetch<PublicShareStatus>(`/api/share/${token}`);
}

export async function verifySharePassword(token: string, password: string) {
  return apiFetch<{ token: string; passwordValid: boolean }>(`/api/share/${token}/verify-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function downloadShare(token: string, password?: string) {
  return apiFetch<{ token: string; downloadAllowed: boolean; downloadUrl: string }>(`/api/share/${token}/download`, {
    method: 'POST',
    body: JSON.stringify(password ? { password } : {}),
  });
}

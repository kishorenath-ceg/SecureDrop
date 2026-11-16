import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const PBKDF2_ITERATIONS = 60_000;
const DOWNLOAD_TICKET_TTL_MS = 5 * 60 * 1000;
export const MAX_SHARE_FILE_COUNT = 50;
export const MAX_SHARE_TRANSFER_BYTES = 1024 * 1024 * 1024;

export const createShareToken = () =>
  randomBytes(18).toString('base64url').replace(/[-_]/g, (char) => (char === '-' ? 'A' : 'B')).slice(0, 24);

export function normalizeCustomSlug(slug?: string | null) {
  if (!slug) {
    return null;
  }

  const normalized = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.length >= 3 && normalized.length <= 80 ? normalized : null;
}

export const shareLinkConfigSchema = z.object({
  fileId: z.string().trim().min(1).max(255).optional().nullable(),
  fileIds: z.array(z.string().trim().min(1).max(255)).min(1).max(MAX_SHARE_FILE_COUNT).optional(),
  customSlug: z
    .string()
    .trim()
    .transform((value) => value || null)
    .pipe(
      z
        .string()
        .nullable()
        .refine((value) => value === null || /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value), {
          message: 'Custom link slug can only contain letters, numbers, and single hyphens.',
        })
        .refine((value) => value === null || value.length >= 3, {
          message: 'Custom link slug must be at least 3 characters long.',
        })
        .refine((value) => value === null || value.length <= 80, {
          message: 'Custom link slug is too long.',
        })
    )
    .optional()
    .nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  maxDownloads: z.number().int().min(1).max(10000).optional().nullable(),
  password: z.string().min(8).max(128).optional().nullable(),
  message: z.string().max(500).optional().nullable(),
});

export const validateShareLinkConfig = (input: unknown) => shareLinkConfigSchema.safeParse(input);

export type ShareLinkConfig = z.infer<typeof shareLinkConfigSchema>;

export type ShareAccessReason =
  | 'LINK_EXPIRED'
  | 'DOWNLOAD_LIMIT_REACHED'
  | 'INVALID_PASSWORD'
  | 'LINK_DISABLED'
  | 'LINK_REVOKED'
  | 'UNAUTHORIZED';

export type ShareAccessEvaluation = {
  allowed: boolean;
  reason?: ShareAccessReason;
  expired: boolean;
  passwordRequired: boolean;
  downloadLimitReached: boolean;
};

export function isExpired(expiresAt?: string | null) {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() <= Date.now();
}

export function canDownload(downloadCount: number, maxDownloads?: number | null) {
  if (maxDownloads === null || maxDownloads === undefined || maxDownloads === 0) {
    return true;
  }

  return downloadCount < maxDownloads;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = await new Promise<string>((resolve, reject) => {
    pbkdf2(password, salt, PBKDF2_ITERATIONS, 64, 'sha512', (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey.toString('hex'));
    });
  });

  return `${salt}:${hash}`;
}

export async function verifyPasswordHash(password: string, storedHash: string | null | undefined) {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }

  const [salt, hash] = storedHash.split(':');
  const candidate = await new Promise<string>((resolve, reject) => {
    pbkdf2(password, salt, PBKDF2_ITERATIONS, 64, 'sha512', (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey.toString('hex'));
    });
  });

  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

export async function evaluateShareAccess({
  expiresAt,
  isActive = true,
  isRevoked = false,
  passwordHash,
  password,
  downloadCount = 0,
  maxDownloads,
}: {
  expiresAt?: string | null;
  isActive?: boolean;
  isRevoked?: boolean;
  passwordHash?: string | null;
  password?: string | null;
  downloadCount?: number;
  maxDownloads?: number | null;
}): Promise<ShareAccessEvaluation> {
  const expired = isExpired(expiresAt);
  const passwordRequired = Boolean(passwordHash);

  if (!isActive) {
    return { allowed: false, reason: 'LINK_DISABLED', expired, passwordRequired, downloadLimitReached: false };
  }

  if (isRevoked) {
    return { allowed: false, reason: 'LINK_REVOKED', expired, passwordRequired, downloadLimitReached: false };
  }

  if (expired) {
    return { allowed: false, reason: 'LINK_EXPIRED', expired: true, passwordRequired, downloadLimitReached: false };
  }

  if (passwordRequired) {
    const validPassword = password ? await verifyPasswordHash(password, passwordHash) : false;
    if (!validPassword) {
      return {
        allowed: false,
        reason: 'INVALID_PASSWORD',
        expired: false,
        passwordRequired: true,
        downloadLimitReached: false,
      };
    }
  }

  const downloadLimitReached = !canDownload(downloadCount, maxDownloads);

  if (downloadLimitReached) {
    return {
      allowed: false,
      reason: 'DOWNLOAD_LIMIT_REACHED',
      expired: false,
      passwordRequired,
      downloadLimitReached: true,
    };
  }

  return {
    allowed: true,
    expired: false,
    passwordRequired,
    downloadLimitReached: false,
  };
}

export type ShareLinkRecord = {
  id: string;
  ownerId: string;
  token: string;
  customSlug?: string | null;
  fileId?: string | null;
  fileIds: string[];
  passwordHash?: string | null;
  expiresAt?: string | null;
  maxDownloads?: number | null;
  downloadCount: number;
  isActive: boolean;
  isRevoked: boolean;
  ownerMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const shareLinkStore = new Map<string, ShareLinkRecord>();
export const shareSlugIndex = new Map<string, string>();
const shareDownloadTickets = new Map<string, { token: string; expiresAt: number }>();

export function getShareFileIds(share: Pick<ShareLinkRecord, 'fileId' | 'fileIds'>) {
  return share.fileIds.length > 0 ? share.fileIds : share.fileId ? [share.fileId] : [];
}

export function createShareDownloadTicket(token: string) {
  const now = Date.now();
  for (const [ticket, record] of shareDownloadTickets) {
    if (record.expiresAt <= now) {
      shareDownloadTickets.delete(ticket);
    }
  }

  const ticket = randomBytes(32).toString('base64url');
  shareDownloadTickets.set(ticket, { token, expiresAt: now + DOWNLOAD_TICKET_TTL_MS });
  return ticket;
}

export function consumeShareDownloadTicket(ticket: string, token: string) {
  const record = shareDownloadTickets.get(ticket);
  if (!record) return false;
  if (record.expiresAt <= Date.now()) {
    shareDownloadTickets.delete(ticket);
    return false;
  }
  if (record.token !== token) return false;

  shareDownloadTickets.delete(ticket);
  return true;
}

export function createShareRecord(input: {
  ownerId: string;
  token?: string;
  customSlug?: string | null;
  fileId?: string | null;
  fileIds?: string[];
  passwordHash?: string | null;
  expiresAt?: string | null;
  maxDownloads?: number | null;
  isActive?: boolean;
  isRevoked?: boolean;
  ownerMessage?: string | null;
}) {
  const token = input.token ?? createShareToken();
  const customSlug = normalizeCustomSlug(input.customSlug ?? null) ?? null;
  const createdAt = new Date().toISOString();
  const record: ShareLinkRecord = {
    id: `share-${Math.random().toString(36).slice(2, 10)}`,
    ownerId: input.ownerId,
    token,
    customSlug,
    fileId: input.fileId ?? null,
    fileIds: Array.from(new Set(input.fileIds ?? (input.fileId ? [input.fileId] : []))),
    passwordHash: input.passwordHash ?? null,
    expiresAt: input.expiresAt ?? null,
    maxDownloads: input.maxDownloads ?? null,
    downloadCount: 0,
    isActive: input.isActive ?? true,
    isRevoked: input.isRevoked ?? false,
    ownerMessage: input.ownerMessage ?? null,
    createdAt,
    updatedAt: createdAt,
  };

  shareLinkStore.set(token, record);
  if (customSlug) {
    shareSlugIndex.set(customSlug, token);
  }

  return record;
}

export function getShareRecordByToken(token: string) {
  return shareLinkStore.get(token) ?? null;
}

export function getShareRecordBySlug(slug: string) {
  const token = shareSlugIndex.get(normalizeCustomSlug(slug) ?? '');
  return token ? shareLinkStore.get(token) ?? null : null;
}

export function listShareLinksForOwner(ownerId: string) {
  return Array.from(shareLinkStore.values())
    .filter((item) => item.ownerId === ownerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function deleteShareLinksForFile(fileId: string) {
  for (const [token, record] of shareLinkStore) {
    if (!getShareFileIds(record).includes(fileId)) {
      continue;
    }

    shareLinkStore.delete(token);
    if (record.customSlug && shareSlugIndex.get(record.customSlug) === token) {
      shareSlugIndex.delete(record.customSlug);
    }
  }
}

export function revokeShareLinkById(id: string) {
  const record = Array.from(shareLinkStore.values()).find((item) => item.id === id);
  if (!record) {
    return null;
  }

  record.isRevoked = true;
  record.isActive = false;
  record.updatedAt = new Date().toISOString();
  return record;
}

export function incrementShareDownload(token: string) {
  const record = getShareRecordByToken(token);
  if (!record) {
    return null;
  }

  record.downloadCount += 1;
  record.updatedAt = new Date().toISOString();
  return record;
}

export function buildPublicShareUrl(baseUrl: string, token: string, filenameSlug?: string | null) {
  const filename = normalizeCustomSlug(filenameSlug) ?? 'file';
  return `${baseUrl.replace(/\/$/, '')}/SecureDrop/${filename}-${token}`;
}

export function buildShareDownloadUrl(baseUrl: string, fileId: string, token: string) {
  return `${baseUrl.replace(/\/$/, '')}/api/files/${encodeURIComponent(fileId)}/download?token=${encodeURIComponent(token)}`;
}

export function buildShareTicketUrl(baseUrl: string, token: string, ticket: string) {
  return `${baseUrl.replace(/\/$/, '')}/api/share/${encodeURIComponent(token)}/download/${encodeURIComponent(ticket)}`;
}

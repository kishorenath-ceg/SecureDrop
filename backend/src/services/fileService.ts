import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { buildSupabaseStoragePath, DEFAULT_STORAGE_BUCKET, isSupabaseConfigured } from './supabaseService.js';

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export const uploadFileSchema = z.object({
  originalName: z
    .string()
    .trim()
    .min(1, 'File name is required.')
    .max(255, 'File name is too long.')
    .refine((value) => !/[\\/]/.test(value), 'File path separators are not allowed.'),
  mimeType: z.string().trim().min(1, 'Mime type is required.'),
  sizeBytes: z
    .number()
    .int()
    .positive('File size must be greater than zero.')
    .max(MAX_FILE_SIZE_BYTES, 'File exceeds the 100 MB limit.'),
});

export type UploadFilePayload = z.infer<typeof uploadFileSchema>;

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'application/octet-stream',
  'application/json',
  'text/csv',
  'application/xml',
  'text/xml',
  'application/x-tar',
  'application/x-rar-compressed',
]);

export function sanitizeOriginalName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? 'file';
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  return sanitized.length > 180 ? sanitized.slice(0, 180) : sanitized || 'file';
}

export function buildStoragePath(userId: string, originalName: string) {
  const safeName = sanitizeOriginalName(originalName);

  if (isSupabaseConfigured()) {
    return buildSupabaseStoragePath(userId, safeName);
  }

  return `${userId}/uploads/${randomUUID()}-${safeName}`;
}

export function isAllowedMimeType(mimeType: string) {
  if (mimeType.startsWith('text/')) {
    return true;
  }

  if (mimeType.startsWith('application/')) {
    return allowedMimeTypes.has(mimeType);
  }

  if (mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
    return allowedMimeTypes.has(mimeType);
  }

  return false;
}

export type StoredFileRecord = {
  id: string;
  ownerId: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  status: string;
  deletedAt?: string | null;
  isDeleted?: boolean;
  buffer?: Buffer;
};

type FileDatabaseRow = {
  id: string;
  owner_id: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number | string;
  created_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
};

function mapFileRow(row: FileDatabaseRow): StoredFileRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    originalName: row.original_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    createdAt: row.created_at,
    status: row.is_deleted ? 'deleted' : 'uploaded',
    deletedAt: row.deleted_at,
    isDeleted: row.is_deleted,
  };
}

export const uploadedFiles = new Map<string, StoredFileRecord>();

export async function createUploadRecord(input: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  userId: string;
  storagePath?: string;
}) {
  const payload = uploadFileSchema.parse(input);

  if (!isAllowedMimeType(payload.mimeType)) {
    throw new Error('This file type is not currently supported.');
  }

  const storagePath = input.storagePath ?? buildStoragePath(input.userId, payload.originalName);

  return {
    id: randomUUID(),
    ownerId: input.userId,
    originalName: payload.originalName,
    storagePath,
    mimeType: payload.mimeType,
    sizeBytes: payload.sizeBytes,
    createdAt: new Date().toISOString(),
    status: 'uploaded',
  };
}

export async function listFilesForOwner(ownerId: string) {
  if (supabaseAdmin && isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error || !data) {
      throw new Error('Unable to load file metadata from Supabase.');
    }

    return data.map((row) => mapFileRow(row as FileDatabaseRow));
  }

  return Array.from(uploadedFiles.values())
    .filter((file) => file.ownerId === ownerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getOwnedFile(fileId: string, ownerId: string) {
  if (supabaseAdmin && isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      throw new Error('Unable to load file metadata from Supabase.');
    }

    return data ? mapFileRow(data as FileDatabaseRow) : null;
  }

  const file = uploadedFiles.get(fileId);
  return file && file.ownerId === ownerId && !file.deletedAt && !file.isDeleted ? file : null;
}

export async function getFileById(fileId: string) {
  if (supabaseAdmin && isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', fileId)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      throw new Error('Unable to load file metadata from Supabase.');
    }

    return data ? mapFileRow(data as FileDatabaseRow) : null;
  }

  const file = uploadedFiles.get(fileId);
  return file && !file.deletedAt && !file.isDeleted ? file : null;
}

export async function storeUploadedFile(record: StoredFileRecord, buffer: Buffer) {
  if (supabaseAdmin && isSupabaseConfigured()) {
    const storage = supabaseAdmin.storage.from(DEFAULT_STORAGE_BUCKET);
    const { error: storageError } = await storage.upload(record.storagePath, buffer, {
      contentType: record.mimeType,
      upsert: false,
    });

    if (storageError) {
      throw new Error('Unable to store the file in private Storage.');
    }

    const { data, error: metadataError } = await supabaseAdmin
      .from('files')
      .insert({
        id: record.id,
        owner_id: record.ownerId,
        original_name: record.originalName,
        storage_path: record.storagePath,
        mime_type: record.mimeType,
        size_bytes: record.sizeBytes,
        created_at: record.createdAt,
        updated_at: record.createdAt,
        deleted_at: null,
        is_deleted: false,
      })
      .select('*')
      .single();

    if (metadataError || !data) {
      await storage.remove([record.storagePath]);
      throw new Error('Unable to save file metadata in Supabase.');
    }

    return mapFileRow(data as FileDatabaseRow);
  }

  const localRecord = { ...record, buffer };
  uploadedFiles.set(record.id, localRecord);
  return localRecord;
}

export async function readStoredFile(file: StoredFileRecord) {
  if (file.buffer) {
    return file.buffer;
  }

  if (supabaseAdmin && isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin.storage.from(DEFAULT_STORAGE_BUCKET).download(file.storagePath);

    if (!error && data) {
      return Buffer.from(await data.arrayBuffer());
    }
  }

  throw new Error('Unable to read the stored file.');
}

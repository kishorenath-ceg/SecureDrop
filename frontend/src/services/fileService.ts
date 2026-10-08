import { apiFetch } from '../lib/api';
import { supabase } from '../lib/supabase';

export type UploadResult = {
  id: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  status: string;
  uploadUrl: string;
};

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const session = supabase ? await supabase.auth.getSession() : null;
  const token = session?.data.session?.access_token ?? null;

  const response = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/files/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const payload = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: payload.error ?? {
        code: 'UPLOAD_FAILED',
        message: 'Upload failed.',
      },
    };
  }

  return {
    success: true,
    data: payload.data as UploadResult,
  };
}

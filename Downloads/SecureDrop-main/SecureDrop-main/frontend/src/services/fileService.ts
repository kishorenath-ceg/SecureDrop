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

export async function uploadFile(file: File, onProgress?: (progress: number) => void) {
  const formData = new FormData();
  formData.append('file', file);

  const session = supabase ? await supabase.auth.getSession() : null;
  const token = session?.data.session?.access_token ?? null;

  return new Promise<
    | { success: true; data: UploadResult }
    | { success: false; error: { code: string; message: string } }
  >((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/files/upload`);
    request.timeout = 120_000;

    if (token) {
      request.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    });

    request.addEventListener('load', () => {
      let payload: {
        data?: UploadResult;
        error?: { code?: string; message?: string };
      };

      try {
        payload = JSON.parse(request.responseText);
      } catch {
        resolve({
          success: false,
          error: {
            code: 'INVALID_RESPONSE',
            message: 'The server returned an invalid upload response.',
          },
        });
        return;
      }

      if (request.status < 200 || request.status >= 300) {
        resolve({
          success: false,
          error: {
            code: payload.error?.code ?? 'UPLOAD_FAILED',
            message: payload.error?.message ?? 'Upload failed.',
          },
        });
        return;
      }

      if (!payload.data?.id) {
        resolve({
          success: false,
          error: {
            code: 'INVALID_RESPONSE',
            message: 'The server response did not include the uploaded file.',
          },
        });
        return;
      }

      resolve({ success: true, data: payload.data });
    });

    request.addEventListener('error', () => reject(new Error('Network error while uploading the file.')));
    request.addEventListener('timeout', () => reject(new Error('Upload timed out. Please retry.')));
    request.addEventListener('abort', () => reject(new Error('Upload was cancelled.')));
    request.send(formData);
  });
}

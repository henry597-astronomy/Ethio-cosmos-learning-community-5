import { getApiUrl } from '@/lib/api-config';
import { supabase } from '@/supabase';

const R2_API_PATH = '/api/video/resolve';

type R2ErrorPayload = {
  error?: string;
  code?: string;
};

type R2UploadResponse = {
  upload_id: string;
  upload_url: string;
  expires_at: string;
  storage_provider: 'r2';
};

type R2ShortResponse = {
  short?: {
    short_id?: string;
    video_url?: string;
    storage_provider?: 'r2';
  };
};

async function callR2<T>(operation: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Please sign in again before uploading a Short.');

  const response = await fetch(getApiUrl(R2_API_PATH), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ operation, ...body }),
  });

  const responseText = await response.text();
  let payload: T & R2ErrorPayload = {} as T & R2ErrorPayload;
  try {
    payload = JSON.parse(responseText) as T & R2ErrorPayload;
  } catch {
    // Keep a useful generic error when the API did not return JSON.
  }

  if (!response.ok) {
    const error = new Error(payload.error || `External Shorts storage failed (HTTP ${response.status})`);
    Object.assign(error, { code: payload.code, status: response.status });
    throw error;
  }

  return payload;
}

export const createR2ShortUpload = (size: number, contentType: string) =>
  callR2<R2UploadResponse>('r2_create_upload', {
    size,
    content_type: contentType,
  });

export const finalizeR2ShortUpload = (
  uploadId: string,
  size: number,
  caption: string,
) => callR2<R2ShortResponse>('r2_finalize_upload', {
  upload_id: uploadId,
  actual_bytes: size,
  caption,
});

export const cancelR2ShortUpload = (uploadId: string) =>
  callR2<void>('r2_cancel_upload', { upload_id: uploadId });

export const deleteR2Short = (shortId: string) =>
  callR2<void>('r2_delete_short', { short_id: shortId });

export const isR2NotConfiguredError = (error: unknown): boolean =>
  typeof error === 'object'
  && error !== null
  && (error as { code?: unknown }).code === 'R2_NOT_CONFIGURED';

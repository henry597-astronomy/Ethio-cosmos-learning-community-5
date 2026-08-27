import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyApiSecurityHeaders,
  authenticateSupabaseRequest,
  boundedString,
  enforceRateLimit,
  getClientAddress,
} from './security.js';

const MAX_SHORT_BYTES = 100 * 1024 * 1024;
const HARD_FREE_TIER_CAP_BYTES = 8 * 1024 * 1024 * 1024;
const UPLOAD_URL_TTL_SECONDS = 15 * 60;
const UPLOAD_RESERVATION_TTL_MS = UPLOAD_URL_TTL_SECONDS * 1000;
const ALLOWED_CONTENT_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
]);
const EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-m4v': 'm4v',
};
const R2_KEY_PATTERN = /^shorts\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|webm|mov|m4v)$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const R2_OPERATIONS = new Set([
  'r2_create_upload',
  'r2_finalize_upload',
  'r2_cancel_upload',
  'r2_delete_short',
]);

type R2Operation =
  | 'r2_create_upload'
  | 'r2_finalize_upload'
  | 'r2_cancel_upload'
  | 'r2_delete_short';

type RequestBody = Record<string, unknown>;

type R2Config = {
  bucket: string;
  publicBaseUrl: string;
  client: S3Client;
};

function getBody(req: VercelRequest): RequestBody {
  return req.body && typeof req.body === 'object' ? req.body as RequestBody : {};
}

function getR2MaxBytes(): number {
  const configured = Number(process.env.R2_APP_MAX_BYTES);
  if (!Number.isFinite(configured) || configured <= 0) return HARD_FREE_TIER_CAP_BYTES;
  return Math.min(Math.floor(configured), HARD_FREE_TIER_CAP_BYTES);
}

function getR2Config(): R2Config | null {
  const accountId = boundedString(process.env.R2_ACCOUNT_ID, 128);
  const accessKeyId = boundedString(process.env.R2_ACCESS_KEY_ID, 256);
  const secretAccessKey = boundedString(process.env.R2_SECRET_ACCESS_KEY, 512);
  const bucket = boundedString(process.env.R2_BUCKET_NAME, 128);
  const publicBaseUrlValue = boundedString(process.env.R2_PUBLIC_BASE_URL, 2048);
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrlValue) return null;

  let publicBaseUrl: URL;
  try {
    publicBaseUrl = new URL(publicBaseUrlValue);
  } catch {
    return null;
  }
  if (publicBaseUrl.protocol !== 'https:') return null;

  const endpointValue = boundedString(
    process.env.R2_ENDPOINT,
    2048,
  ) || `https://${accountId}.r2.cloudflarestorage.com`;
  let endpoint: URL;
  try {
    endpoint = new URL(endpointValue);
  } catch {
    return null;
  }
  if (endpoint.protocol !== 'https:') return null;

  return {
    bucket,
    publicBaseUrl: publicBaseUrl.toString().replace(/\/+$/, ''),
    client: new S3Client({
      region: 'auto',
      endpoint: endpoint.toString().replace(/\/+$/, ''),
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

function getServiceClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function publicObjectUrl(config: R2Config, objectKey: string): string {
  return `${config.publicBaseUrl}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
}

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function parseFileSize(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return null;
  if (value <= 0 || value > MAX_SHORT_BYTES) return null;
  return value;
}

function parseContentType(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return ALLOWED_CONTENT_TYPES.has(normalized) ? normalized : null;
}

async function authenticateAdmin(
  req: VercelRequest,
  res: VercelResponse,
): Promise<{ userId: string; serviceClient: SupabaseClient } | null> {
  const auth = await authenticateSupabaseRequest(req);
  if (!auth.user) {
    const authReason = 'reason' in auth ? auth.reason : 'invalid';
    res.status(authReason === 'configuration' ? 500 : 401).json({ error: 'Authentication required' });
    return null;
  }

  const { data: isAdmin, error: adminError } = await auth.client.rpc('is_active_admin');
  if (adminError || isAdmin !== true) {
    res.status(403).json({ error: 'Administrator access required' });
    return null;
  }

  const serviceClient = getServiceClient();
  if (!serviceClient) {
    res.status(500).json({ error: 'Shorts storage service is not configured' });
    return null;
  }

  return { userId: auth.user.id, serviceClient };
}

async function cancelReservation(
  serviceClient: SupabaseClient,
  uploadId: string,
  userId: string,
): Promise<void> {
  await serviceClient.rpc('cancel_short_r2_upload', {
    p_upload_id: uploadId,
    p_user_id: userId,
  });
}

async function deleteObject(config: R2Config, objectKey: string): Promise<void> {
  await config.client.send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: objectKey,
  }));
}

async function createUpload(
  req: VercelRequest,
  res: VercelResponse,
  body: RequestBody,
  userId: string,
  serviceClient: SupabaseClient,
  config: R2Config,
): Promise<void> {
  const requestedBytes = parseFileSize(body.size);
  const contentType = parseContentType(body.content_type);
  if (!requestedBytes || !contentType) {
    res.status(400).json({ error: 'Only supported video files up to 100 MB can be uploaded.' });
    return;
  }

  const uploadId = randomUUID();
  const objectKey = `shorts/${userId}/${uploadId}.${EXTENSIONS[contentType]}`;
  const expiresAt = new Date(Date.now() + UPLOAD_RESERVATION_TTL_MS);
  const { data: reserved, error: reserveError } = await serviceClient.rpc('reserve_short_r2_upload', {
    p_upload_id: uploadId,
    p_user_id: userId,
    p_object_key: objectKey,
    p_requested_bytes: requestedBytes,
    p_content_type: contentType,
    p_expires_at: expiresAt.toISOString(),
    p_max_bytes: getR2MaxBytes(),
  });

  if (reserveError) {
    console.error('Could not reserve R2 Shorts quota:', reserveError.message);
    res.status(500).json({ error: 'Could not reserve external Shorts storage.' });
    return;
  }
  if (reserved !== true) {
    res.status(413).json({
      error: 'The free external Shorts storage limit has been reached. Remove an existing R2 Short or wait for an unfinished upload to expire.',
      code: 'R2_QUOTA_REACHED',
    });
    return;
  }

  try {
    const uploadUrl = await getSignedUrl(
      config.client,
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        ContentType: contentType,
      }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS },
    );
    res.status(200).json({
      upload_id: uploadId,
      upload_url: uploadUrl,
      expires_at: expiresAt.toISOString(),
      storage_provider: 'r2',
    });
  } catch (error) {
    await cancelReservation(serviceClient, uploadId, userId);
    console.error('Could not create R2 upload URL:', error);
    res.status(503).json({ error: 'External Shorts storage is temporarily unavailable.' });
  }
}

async function finalizeUpload(
  req: VercelRequest,
  res: VercelResponse,
  body: RequestBody,
  userId: string,
  serviceClient: SupabaseClient,
  config: R2Config,
): Promise<void> {
  const uploadId = body.upload_id;
  if (!isValidUuid(uploadId)) {
    res.status(400).json({ error: 'Invalid external upload reference.' });
    return;
  }

  const { data: uploadRow, error: uploadError } = await serviceClient
    .from('short_r2_uploads')
    .select('id, object_key, requested_bytes, content_type, status, expires_at')
    .eq('id', uploadId)
    .eq('user_id', userId)
    .eq('status', 'reserved')
    .limit(1)
    .maybeSingle();
  if (uploadError || !uploadRow) {
    res.status(404).json({ error: 'The external upload reference is missing or expired.' });
    return;
  }

  const objectKey = uploadRow.object_key as string;
  if (!R2_KEY_PATTERN.test(objectKey)) {
    await cancelReservation(serviceClient, uploadId, userId);
    res.status(400).json({ error: 'Invalid external storage object.' });
    return;
  }

  let actualBytes = 0;
  try {
    const head = await config.client.send(new HeadObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
    }));
    actualBytes = typeof head.ContentLength === 'number' ? head.ContentLength : 0;
    const storedContentType = typeof head.ContentType === 'string'
      ? head.ContentType.toLowerCase().split(';', 1)[0].trim()
      : '';
    if (
      actualBytes <= 0
      || actualBytes > Number(uploadRow.requested_bytes)
      || (storedContentType && storedContentType !== uploadRow.content_type)
    ) {
      await deleteObject(config, objectKey);
      await cancelReservation(serviceClient, uploadId, userId);
      res.status(400).json({ error: 'The uploaded video did not pass validation.' });
      return;
    }
  } catch (error) {
    console.error('Could not verify R2 Shorts object:', error);
    await cancelReservation(serviceClient, uploadId, userId);
    res.status(400).json({ error: 'The uploaded video could not be verified.' });
    return;
  }

  const caption = boundedString(body.caption, 500) || 'New short';
  const { data: finalized, error: finalizeError } = await serviceClient.rpc('finalize_short_r2_upload', {
    p_upload_id: uploadId,
    p_user_id: userId,
    p_actual_bytes: actualBytes,
    p_video_url: publicObjectUrl(config, objectKey),
    p_caption: caption,
  });
  if (finalizeError || !finalized) {
    await deleteObject(config, objectKey).catch(() => undefined);
    await cancelReservation(serviceClient, uploadId, userId);
    console.error('Could not finalize R2 Shorts metadata:', finalizeError?.message || 'No result');
    res.status(500).json({ error: 'The video was uploaded but could not be registered safely.' });
    return;
  }

  res.status(200).json({ short: finalized });
}

async function cancelUpload(
  res: VercelResponse,
  body: RequestBody,
  userId: string,
  serviceClient: SupabaseClient,
  config: R2Config,
): Promise<void> {
  const uploadId = body.upload_id;
  if (!isValidUuid(uploadId)) {
    res.status(400).json({ error: 'Invalid external upload reference.' });
    return;
  }

  const { data: uploadRow } = await serviceClient
    .from('short_r2_uploads')
    .select('object_key')
    .eq('id', uploadId)
    .eq('user_id', userId)
    .eq('status', 'reserved')
    .limit(1)
    .maybeSingle();
  if (uploadRow?.object_key && R2_KEY_PATTERN.test(uploadRow.object_key)) {
    await deleteObject(config, uploadRow.object_key).catch(() => undefined);
  }
  await cancelReservation(serviceClient, uploadId, userId);
  res.status(204).end();
}

async function deleteShort(
  res: VercelResponse,
  body: RequestBody,
  serviceClient: SupabaseClient,
  config: R2Config,
): Promise<void> {
  const shortId = body.short_id;
  if (!isValidUuid(shortId)) {
    res.status(400).json({ error: 'Invalid Short reference.' });
    return;
  }

  const { data: shortRow, error: shortError } = await serviceClient
    .from('shorts')
    .select('id, storage_provider, storage_key')
    .eq('id', shortId)
    .limit(1)
    .maybeSingle();
  if (shortError) {
    res.status(500).json({ error: 'Could not load the Short for deletion.' });
    return;
  }
  if (!shortRow || shortRow.storage_provider !== 'r2' || typeof shortRow.storage_key !== 'string') {
    res.status(400).json({ error: 'This Short is not stored in external storage.' });
    return;
  }
  if (!R2_KEY_PATTERN.test(shortRow.storage_key)) {
    res.status(400).json({ error: 'The external storage reference is invalid.' });
    return;
  }

  try {
    await deleteObject(config, shortRow.storage_key);
  } catch (error) {
    console.error('Could not delete R2 Short object:', error);
    res.status(502).json({ error: 'The external video could not be deleted safely.' });
    return;
  }

  const { data: deleted, error: metadataError } = await serviceClient.rpc('delete_short_r2_metadata', {
    p_short_id: shortId,
  });
  if (metadataError || deleted !== true) {
    console.error('Could not delete R2 Short metadata:', metadataError?.message || 'No result');
    res.status(500).json({ error: 'The video file was removed but its record needs a safe retry.' });
    return;
  }

  res.status(204).end();
}

export function isR2Operation(value: unknown): value is R2Operation {
  return typeof value === 'string' && R2_OPERATIONS.has(value);
}

export async function handleR2ShortsOperation(
  req: VercelRequest,
  res: VercelResponse,
  operation: R2Operation,
): Promise<void> {
  applyApiSecurityHeaders(req, res, 'POST, OPTIONS');
  const address = getClientAddress(req);
  if (!enforceRateLimit(`shorts-r2:${address}`, 20, 60_000, res)) {
    res.status(429).json({ error: 'Too many Shorts storage requests. Please try again shortly.' });
    return;
  }

  const body = getBody(req);
  const auth = await authenticateAdmin(req, res);
  if (!auth) return;

  const config = getR2Config();
  if (!config) {
    res.status(503).json({
      error: 'External Shorts storage is not configured yet. Existing Supabase Shorts storage remains available.',
      code: 'R2_NOT_CONFIGURED',
    });
    return;
  }

  if (operation === 'r2_create_upload') {
    await createUpload(req, res, body, auth.userId, auth.serviceClient, config);
    return;
  }
  if (operation === 'r2_finalize_upload') {
    await finalizeUpload(req, res, body, auth.userId, auth.serviceClient, config);
    return;
  }
  if (operation === 'r2_cancel_upload') {
    await cancelUpload(res, body, auth.userId, auth.serviceClient, config);
    return;
  }
  await deleteShort(res, body, auth.serviceClient, config);
}

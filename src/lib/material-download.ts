import { Capacitor, registerPlugin } from '@capacitor/core';

interface DownloadsPlugin {
  save(options: {
    fileName: string;
    mimeType: string;
    data: string;
  }): Promise<{ uri?: string }>;
}

const Downloads = registerPlugin<DownloadsPlugin>('Downloads');

function sanitizeFileName(value: string): string {
  const normalized = value.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, ' ');
  return (normalized || 'ethio-cosmos-material').slice(0, 120);
}

function extensionForMime(mimeType: string, url: string): string {
  const known = mimeType.toLowerCase().split(';')[0];
  if (known === 'application/pdf') return '.pdf';
  if (known === 'image/jpeg') return '.jpg';
  if (known === 'image/png') return '.png';
  if (known === 'image/webp') return '.webp';
  if (known === 'video/mp4') return '.mp4';
  if (known === 'video/webm') return '.webm';
  try {
    const ext = new URL(url).pathname.match(/\.[a-z0-9]{2,5}$/i)?.[0];
    return ext || '';
  } catch {
    return '';
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

export async function exportMaterialToDownloads(
  blob: Blob,
  title: string,
  sourceUrl: string,
): Promise<void> {
  if (!blob.size) throw new Error('The downloaded material was empty.');
  const mimeType = blob.type || 'application/octet-stream';
  const extension = extensionForMime(mimeType, sourceUrl);
  const baseName = sanitizeFileName(title).replace(/\.[a-z0-9]{2,5}$/i, '');
  const fileName = `${baseName}${extension}`;
  const data = await blobToBase64(blob);

  if (Capacitor.isNativePlatform()) {
    await Downloads.save({ fileName, mimeType, data });
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  }
}

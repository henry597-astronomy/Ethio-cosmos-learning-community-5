import { readFile, unlink } from 'node:fs/promises';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable, { type File } from 'formidable';
import {
  applyApiSecurityHeaders,
  authenticateSupabaseRequest,
  enforceRateLimit,
  getClientAddress,
  handleOptions,
} from '../_lib/security.js';

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MAX_TRANSCRIPT_CHARS = 4000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 6;

function parseAudioUpload(req: VercelRequest): Promise<File> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFiles: 1,
      maxFileSize: MAX_AUDIO_BYTES,
      allowEmptyFiles: false,
      keepExtensions: true,
      filter: ({ mimetype }) => Boolean(mimetype?.startsWith('audio/')),
    });

    form.parse(req, (_error, _fields, files) => {
      if (_error) {
        reject(_error);
        return;
      }

      const candidate = files.audio;
      const file = Array.isArray(candidate) ? candidate[0] : candidate;
      if (!file) {
        reject(new Error('Audio file is required.'));
        return;
      }

      resolve(file);
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res, 'POST,OPTIONS')) return;
  applyApiSecurityHeaders(req, res, 'POST,OPTIONS');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const auth = await authenticateSupabaseRequest(req);
  if (!auth.user) {
    return res.status(auth.reason === 'configuration' ? 503 : 401).json({
      error: auth.reason === 'configuration'
        ? 'Voice service is temporarily unavailable.'
        : 'Sign in to use voice input.',
    });
  }

  const rateLimitKey = `voice:${auth.user.id}:${getClientAddress(req)}`;
  if (!enforceRateLimit(rateLimitKey, MAX_REQUESTS_PER_WINDOW, RATE_LIMIT_WINDOW_MS, res)) {
    return res.status(429).json({ error: 'Too many voice requests. Please try again shortly.' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not configured on the server');
    return res.status(503).json({ error: 'Voice service is temporarily unavailable.' });
  }

  let uploadedFile: File | null = null;
  try {
    uploadedFile = await parseAudioUpload(req);

    if (!uploadedFile.filepath || uploadedFile.size <= 0 || uploadedFile.size > MAX_AUDIO_BYTES) {
      return res.status(413).json({ error: 'Audio recording is too large.' });
    }

    const audio = await readFile(uploadedFile.filepath);
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([audio], { type: uploadedFile.mimetype || 'audio/webm' }),
      uploadedFile.originalFilename || 'ethio-cosmos-voice.webm',
    );
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');
    formData.append('temperature', '0');
    formData.append(
      'prompt',
      'Astronomy and space-science questions for the Ethio-Cosmos Learning Community.',
    );

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('Groq transcription upstream error:', response.status, data?.error?.message || 'unknown');
      return res.status(502).json({ error: 'Voice transcription failed.' });
    }

    const text = typeof data?.text === 'string' ? data.text.trim() : '';
    if (!text) {
      return res.status(422).json({ error: 'No speech was detected. Please try again.' });
    }

    return res.status(200).json({ text: text.slice(0, MAX_TRANSCRIPT_CHARS) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (message.toLowerCase().includes('maxfilesize') || message.toLowerCase().includes('max file size')) {
      return res.status(413).json({ error: 'Audio recording is too large.' });
    }
    console.error('Voice transcription validation error:', message);
    return res.status(400).json({ error: 'Invalid audio request.' });
  } finally {
    if (uploadedFile?.filepath) {
      await unlink(uploadedFile.filepath).catch(() => undefined);
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
  },
};

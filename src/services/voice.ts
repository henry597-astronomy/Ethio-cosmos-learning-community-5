import { supabase } from '@/supabase';
import { getApiUrl } from '@/lib/api-config';

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export async function transcribeVoiceRecording(audio: Blob): Promise<string> {
  if (audio.size <= 0) {
    throw new Error('No audio was recorded.');
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    throw new Error('The recording is too large. Please speak for less time.');
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Sign in to use voice input.');
  }

  const formData = new FormData();
  formData.append('audio', audio, 'ethio-cosmos-voice.webm');

  const response = await fetch(getApiUrl('/api/voice/transcribe'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: formData,
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof result?.error === 'string' ? result.error : 'Voice transcription failed.');
  }

  if (typeof result?.text !== 'string' || !result.text.trim()) {
    throw new Error('No speech was detected. Please try again.');
  }

  return result.text.trim();
}

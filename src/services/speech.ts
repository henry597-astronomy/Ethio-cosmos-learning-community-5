import { Capacitor } from '@capacitor/core';
import { QueueStrategy, TextToSpeech } from '@capacitor-community/text-to-speech';

const MAX_SPEECH_LENGTH = 4000;

function isAmharicText(text: string): boolean {
  return /[\u1200-\u137F]/.test(text);
}

function preferredWebLanguage(): string {
  if (typeof navigator === 'undefined') return 'en-US';
  return navigator.language || 'en-US';
}

async function speakWithNativeTts(text: string, language: string): Promise<void> {
  await TextToSpeech.stop().catch(() => undefined);

  // The language check prevents Android from silently accepting a language
  // that has no installed voice. Try the exact locale first, then its base
  // language, and finally the device default for English responses.
  const candidates = Array.from(new Set([
    language,
    language.split('-')[0],
    'en-US',
  ]));

  let lastError: unknown = null;
  for (const lang of candidates) {
    try {
      const support = await TextToSpeech.isLanguageSupported({ lang });
      if (!support.supported) continue;
      await TextToSpeech.speak({
        text,
        lang,
        rate: 0.9,
        pitch: 1,
        volume: 1,
        queueStrategy: QueueStrategy.Flush,
      });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  // Some Android engines do not implement isLanguageSupported consistently.
  // Make one final native attempt with the requested locale before falling
  // back to the browser engine.
  try {
    await TextToSpeech.speak({
      text,
      lang: language,
      rate: 0.9,
      pitch: 1,
      volume: 1,
      queueStrategy: QueueStrategy.Flush,
    });
    return;
  } catch (error) {
    throw lastError ?? error;
  }
}

async function speakWithWebTts(text: string, language: string): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    throw new Error('Speech output is not available on this device.');
  }

  const synthesis = window.speechSynthesis;
  synthesis.cancel();
  synthesis.resume();

  await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = synthesis.getVoices();
    const languagePrefix = language.toLowerCase().split('-')[0];
    const matchingVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(languagePrefix));
    if (matchingVoice) utterance.voice = matchingVoice;

    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };

    utterance.onend = () => finish(resolve);
    utterance.onerror = (event) => finish(() => reject(new Error(`Speech output failed: ${event.error || 'unknown error'}`)));

    // Android WebView can require resume() immediately before speak().
    synthesis.resume();
    synthesis.speak(utterance);
  });
}

export async function speakText(text: string): Promise<void> {
  const trimmedText = text.trim().slice(0, MAX_SPEECH_LENGTH);
  if (!trimmedText) return;

  const language = isAmharicText(trimmedText) ? 'am-ET' : preferredWebLanguage();

  if (Capacitor.isNativePlatform()) {
    try {
      await speakWithNativeTts(trimmedText, language);
      return;
    } catch (nativeError) {
      console.warn('Native speech output failed; trying WebView speech output.', nativeError);
    }
  }

  await speakWithWebTts(trimmedText, language);
}

export async function stopSpeech(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await TextToSpeech.stop().catch(() => undefined);
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

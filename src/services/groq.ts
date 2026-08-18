import { getApiUrl, PRODUCTION_URL } from '@/lib/api-config';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const CHAT_PATH = '/api/groq/chat';

async function requestChat(url: string, messages: Message[]): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
    body: JSON.stringify({ messages }),
  });

  const data = await response.json().catch(() => null) as { content?: unknown; error?: unknown } | null;
  if (!response.ok) {
    const serverMessage = typeof data?.error === 'string' ? data.error : `AI request failed (${response.status})`;
    throw new Error(serverMessage);
  }

  if (typeof data?.content !== 'string' || data.content.trim().length === 0) {
    throw new Error('AI service returned an invalid response');
  }

  return data.content;
}

export async function getGroqChatCompletion(messages: Message[]): Promise<string> {
  const primaryUrl = getApiUrl(CHAT_PATH);
  const productionUrl = `${PRODUCTION_URL}${CHAT_PATH}`;

  try {
    return await requestChat(primaryUrl, messages);
  } catch (primaryError) {
    // A stale build-time host or transient WebView DNS failure should not make
    // the chat unusable when the canonical production endpoint is available.
    if (primaryUrl === productionUrl) throw primaryError;
    return requestChat(productionUrl, messages);
  }
}

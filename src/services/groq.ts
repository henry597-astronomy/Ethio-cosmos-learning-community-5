import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { getApiUrl, PRODUCTION_URL } from '@/lib/api-config';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const CHAT_PATH = '/api/groq/chat';
const CONNECT_TIMEOUT_MS = 15_000;
const READ_TIMEOUT_MS = 60_000;

type ChatResponse = { content?: unknown; error?: unknown };

function getServerError(data: ChatResponse | null, status: number): Error {
  const serverMessage = typeof data?.error === 'string'
    ? data.error
    : `AI request failed (${status})`;
  return new Error(serverMessage);
}

function validateChatResponse(data: ChatResponse | null, status: number): string {
  if (status < 200 || status >= 300) {
    throw getServerError(data, status);
  }
  if (typeof data?.content !== 'string' || data.content.trim().length === 0) {
    throw new Error('AI service returned an invalid response');
  }
  return data.content;
}

async function requestChat(url: string, messages: Message[]): Promise<string> {
  const requestData = { messages };

  if (Capacitor.isNativePlatform()) {
    // Native HTTP avoids Android WebView CORS, DNS, and fetch-implementation
    // differences. The API response is intentionally kept JSON-only.
    const response = await CapacitorHttp.post({
      url,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      data: requestData,
      connectTimeout: CONNECT_TIMEOUT_MS,
      readTimeout: READ_TIMEOUT_MS,
      responseType: 'json',
    });
    return validateChatResponse(response.data as ChatResponse | null, response.status);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
    body: JSON.stringify(requestData),
  });

  const data = await response.json().catch(() => null) as ChatResponse | null;
  return validateChatResponse(data, response.status);
}

export async function getGroqChatCompletion(messages: Message[]): Promise<string> {
  const primaryUrl = getApiUrl(CHAT_PATH);
  const productionUrl = `${PRODUCTION_URL}${CHAT_PATH}`;

  try {
    return await requestChat(primaryUrl, messages);
  } catch (primaryError) {
    // A stale build-time host or transient WebView/native-network failure
    // should not make chat unusable when the canonical endpoint is available.
    console.warn('Primary AI endpoint failed; retrying production endpoint.', primaryError);
    if (primaryUrl === productionUrl) throw primaryError;
    return requestChat(productionUrl, messages);
  }
}

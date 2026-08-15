import { getApiUrl } from '@/lib/api-config';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function getGroqChatCompletion(messages: Message[]): Promise<string> {
  const response = await fetch(getApiUrl('/api/groq'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
  });

  let data: { content?: unknown; error?: unknown } = {};
  try {
    data = await response.json();
  } catch {
    // Keep the user-facing error generic if the server did not return JSON.
  }

  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : 'AI service is temporarily unavailable';
    throw new Error(message);
  }

  if (typeof data.content !== 'string' || data.content.length === 0) {
    throw new Error('AI service returned an invalid response');
  }

  return data.content;
}

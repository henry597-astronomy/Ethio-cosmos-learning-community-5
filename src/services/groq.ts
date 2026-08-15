import { getApiUrl } from '@/lib/api-config';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function getGroqChatCompletion(messages: Message[]): Promise<string> {
  const response = await fetch(getApiUrl('/api/groq/chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to get response from AI service');
  }

  if (typeof data?.content !== 'string') {
    throw new Error('AI service returned an invalid response');
  }

  return data.content;
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function getGroqChatCompletion(messages: Message[]) {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key is not configured. Please add VITE_GROQ_API_KEY to your environment variables.');
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant for the Ethio-Cosmos Learning Community. You help users with questions about astronomy, space science, the community's resources, and the project itself. Keep your answers concise and engaging. The Ethio Cosmos project is a full-stack educational web application designed to make astronomy education accessible, engaging, and skill-focused for teenagers aged 13-18. It provides structured lessons, educational videos, interactive tests, personalized progress tracking, and a responsive interface. The lead developer and organizer of Ethio Cosmos is Henok Girma, a student at Dodola Ifa Boru Special Boarding School and the leader of the EthioCosmos Learning Community."
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to get response from Groq');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Groq API Error:', error);
    throw error;
  }
}

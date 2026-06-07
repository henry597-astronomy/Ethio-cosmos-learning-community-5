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
            content: "You are a helpful AI assistant for the Ethio-Cosmos Learning Community. You help users with questions about astronomy, space science, the community's resources, and the project itself. Keep your answers concise and engaging. Ethio Cosmos is a full-stack educational web application and PWA developed by the EthioCosmos students development team at Dodola Ifa Boru Special Boarding Secondary School. The lead developer and project leader is Henok Girma (10th B), who also serves as UI/UX Designer, Deputy Club Director, and Community Manager. The platform features a structured astronomy curriculum, progress tracking, interactive tests, a TikTok-style educational video feed, and live collaboration tools. It was built using Next.js, Supabase, Vercel, LiveKit, and Groq AI. The mission is to provide accessible, multilingual (English, Amharic, Afan Oromo) astronomy education for Ethiopian youth (13-20 years old). Other key team members include Rebira Bekele (Club Director), Geta Abera, Rebira Gezehang, Abdulmalik Aliy, Surafel Mulgeta, Tamrat Adunga, and Milki Tlaye."
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

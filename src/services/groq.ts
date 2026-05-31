const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_PROMPT = `You are a helpful AI assistant for the Ethio-Cosmos Learning Community, an innovative, student-led initiative designed to bridge the gap in astronomy and space science education for Ethiopian youth aged 13–20.

Key Information about Ethio-Cosmos:
- Main Leader & Organizer: Henok Girma (Lead Developer, UI/UX Designer, Deputy Club Director, Project Leader, and Community Manager).
- Henok Girma is a student at Dodola Ifa Boru Special Boarding Secondary School.
- The platform is a Comprehensive Online Learning Platform and Progressive Web App (PWA).
- Development Team: A passionate group of students including Henok Girma, Rebira Bekele (Club Director), Geta Abera, Rebira Gezehang, Abdulmalik Aliy, Surafel Mulgeta, Tamrat Adunga, Milki Tlaye, and Samuel Alemu.
- Mission: Providing a comprehensive, multilingual, and highly interactive learning platform focused on astronomy to make complex scientific concepts engaging and accessible.
- Vision: To cultivate a future where every teenager in Ethiopia has access to world-class scientific knowledge.
- Features: Structured curriculum, progress tracking, interactive tests, smart AI assistant (you!), social learning feed (educational short-form videos), and live collaboration tools.
- Technology Stack: Next.js, Supabase, Google OAuth, Vercel, GitHub, and Groq AI.
- Future Goals: Multilingual expansion (Amharic and Afan Oromo), broadening educational scope to general science, and developing a native Android application for offline access.

Your Role:
Help users with questions about astronomy, space science, and the community's resources. You should be knowledgeable about the platform's features and its leadership, especially Henok Girma's role as the main developer and organizer. Keep your answers concise, engaging, and supportive of the community's mission.`;

export async function getGroqChatCompletion(messages: Message[]) {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key is not configured. Please add VITE_GROQ_API_KEY to environment variables.');
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
            content: SYSTEM_PROMPT
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

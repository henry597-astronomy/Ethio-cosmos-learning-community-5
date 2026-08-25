import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, Brain, Lightbulb, Loader2, RotateCcw, Send, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getGroqChatCompletion, type Message, type TutorLanguage, type TutorMode } from '@/services/groq';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { speakText, stopSpeech } from '@/services/speech';
import { cn } from '@/lib/utils';

type LessonTutorProps = {
  topicTitle: string;
  lessonTitle: string;
  lessonContent: string;
};

const STARTER_PROMPTS: Record<TutorMode, string[]> = {
  tutor: [
    'Explain this lesson simply',
    'What are the key ideas?',
    'Give me a real example',
  ],
  quiz: [
    'Start a quiz',
    'Give me a hint',
    'Ask me a harder question',
  ],
};

export default function LessonTutor({ topicTitle, lessonTitle, lessonContent }: LessonTutorProps) {
  const [mode, setMode] = useState<TutorMode>('tutor');
  const { language: appLanguage, setLanguage: setAppLanguage } = useAppLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const safeLessonContent = useMemo(
    () => lessonContent.trim().slice(0, 12000),
    [lessonContent],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => () => {
    void stopSpeech();
  }, []);

  const resetConversation = () => {
    setMessages([]);
    setInput('');
    setSpeechError(null);
    void stopSpeech();
  };

  const changeMode = (nextMode: TutorMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    resetConversation();
  };

  const changeLanguage = (nextLanguage: TutorLanguage) => {
    const nextAppLanguage = nextLanguage === 'Amharic' ? 'am' : 'en';
    if (nextAppLanguage === appLanguage) return;
    setAppLanguage(nextAppLanguage);
    resetConversation();
  };

  const speakLatestResponse = async (text: string) => {
    if (!isSpeechEnabled) return;
    setSpeechError(null);
    try {
      await speakText(text);
    } catch (error) {
      console.warn('Lesson tutor voice output unavailable:', error);
      setSpeechError('Voice output is unavailable on this device. The text answer is still available.');
    }
  };

  const submitMessage = async (messageText: string) => {
    const trimmed = messageText.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setSpeechError(null);
    setIsLoading(true);

    try {
      const response = await getGroqChatCompletion(nextMessages, {
        tutorContext: {
          topicTitle,
          lessonTitle,
          lessonContent: safeLessonContent,
          mode,
          language: appLanguage === 'am' ? 'Amharic' : 'English',
        },
      });
      setMessages([...nextMessages, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Lesson tutor error:', error);
      const detail = error instanceof Error ? error.message : 'Please try again.';
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: `The tutor could not respond right now. ${detail}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submitMessage(input);
  };

  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');

  return (
    <section className="mt-10 rounded-2xl border border-cyan-400/20 bg-slate-900/90 p-4 shadow-xl sm:p-6" aria-labelledby="lesson-tutor-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h2 id="lesson-tutor-title" className="text-lg font-bold text-white">AI Lesson Tutor</h2>
            <p className="mt-1 text-xs text-slate-400">Grounded in “{lessonTitle}”</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={resetConversation}
          disabled={isLoading || messages.length === 0}
          aria-label="Start a new tutor conversation"
          className="text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Tutor mode">
        <Button
          type="button"
          size="sm"
          onClick={() => changeMode('tutor')}
          className={cn(mode === 'tutor' ? 'bg-cyan-600 text-white hover:bg-cyan-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}
        >
          <BookOpen className="mr-2 h-4 w-4" /> Tutor
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => changeMode('quiz')}
          className={cn(mode === 'quiz' ? 'bg-orange-500 text-white hover:bg-orange-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}
        >
          <Lightbulb className="mr-2 h-4 w-4" /> Quiz Coach
        </Button>
        <div className="ml-auto flex items-center gap-1 rounded-lg bg-slate-800 p-1" role="group" aria-label="Tutor language">
          {(['English', 'Amharic'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => changeLanguage(option)}
              className={cn(
                'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                (appLanguage === 'am' && option === 'Amharic') || (appLanguage === 'en' && option === 'English')
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-white',
              )}
              aria-pressed={(appLanguage === 'am' && option === 'Amharic') || (appLanguage === 'en' && option === 'English')}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-4">
          <p className="text-sm text-slate-300">
            {mode === 'tutor'
              ? 'Ask for a simple explanation, an example, or the key ideas from this lesson.'
              : 'Ask me to start a quiz. I will give one question at a time and wait for your attempt.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STARTER_PROMPTS[mode].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void submitMessage(prompt)}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100 transition-colors hover:bg-cyan-400/20"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/50 p-3" aria-live="polite">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed',
                message.role === 'user'
                  ? 'rounded-br-sm bg-blue-600 text-white'
                  : 'rounded-bl-sm border border-white/10 bg-slate-800 text-slate-100',
              )}>
                {message.content}
                {message.role === 'assistant' && index === messages.length - 1 && (
                  <button
                    type="button"
                    onClick={() => void speakLatestResponse(message.content)}
                    className="mt-2 flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-100"
                    aria-label="Read the tutor response aloud"
                  >
                    <Volume2 className="h-3.5 w-3.5" /> Read aloud
                  </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-slate-800 px-3 py-2 text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" aria-label="Tutor is thinking" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {(speechError || latestAssistantMessage) && (
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-400">
          <span role={speechError ? 'status' : undefined}>{speechError || 'Responses remain available as text even when voice is muted.'}</span>
          <button
            type="button"
            onClick={() => {
              if (isSpeechEnabled) void stopSpeech();
              setIsSpeechEnabled((enabled) => !enabled);
              setSpeechError(null);
            }}
            className="flex shrink-0 items-center gap-1 text-slate-300 hover:text-white"
            aria-label={isSpeechEnabled ? 'Mute tutor voice' : 'Enable tutor voice'}
          >
            {isSpeechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {isSpeechEnabled ? 'Voice on' : 'Voice off'}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={mode === 'quiz' ? 'Answer or ask for a hint...' : 'Ask about this lesson...'}
          disabled={isLoading}
          className="border-white/10 bg-slate-800 text-white placeholder:text-slate-500"
          aria-label={mode === 'quiz' ? 'Answer the quiz coach' : 'Ask the lesson tutor'}
        />
        <Button type="submit" disabled={!input.trim() || isLoading} className="shrink-0 bg-cyan-600 text-white hover:bg-cyan-500" aria-label="Send tutor question">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </section>
  );
}

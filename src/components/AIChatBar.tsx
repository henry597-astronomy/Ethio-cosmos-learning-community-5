import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, Sparkles, X, MessageSquare, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { getGroqChatCompletion, type Message, type TutorLanguage, type TutorMode } from '@/services/groq';
import { useLessonTutorContext } from '@/context/LessonTutorContext';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { transcribeVoiceRecording } from '@/services/voice';
import { speakText, stopSpeech } from '@/services/speech';
import { cn } from '@/lib/utils';

export default function AIChatBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [tutorMode, setTutorMode] = useState<TutorMode>('tutor');
  const { activeLesson } = useLessonTutorContext();
  const { language, languageName, t: translate } = useAppLanguage();
  const previousLanguageRef = useRef(language);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  
  // Draggable state
  const [position, setPosition] = useState({ x: window.innerWidth - 88, y: window.innerHeight - 88 });
  const [isDragging, setIsDragging] = useState(false);
  const [viewport, setViewport] = useState({
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
    offsetTop: window.visualViewport?.offsetTop ?? 0,
  });
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const didDragRef = useRef(false);
  const positionRef = useRef(position);
  const snapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSnapping, setIsSnapping] = useState(false);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const clearSnapTimeout = () => {
    if (snapTimeoutRef.current !== null) {
      window.clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = null;
    }
  };

  const scheduleCornerSnap = () => {
    clearSnapTimeout();
    snapTimeoutRef.current = window.setTimeout(() => {
      const bubbleSize = 56;
      const inset = 20;
      const maxX = Math.max(inset, window.innerWidth - bubbleSize - inset);
      const maxY = Math.max(inset, window.innerHeight - bubbleSize - inset);
      const currentX = Math.min(Math.max(0, positionRef.current.x), maxX);
      const currentY = Math.min(Math.max(0, positionRef.current.y), maxY);
      const corners = [
        { x: inset, y: inset },
        { x: maxX, y: inset },
        { x: inset, y: maxY },
        { x: maxX, y: maxY },
      ];

      const nearestCorner = corners.reduce((nearest, corner) => {
        const nearestDistance = Math.hypot(nearest.x - currentX, nearest.y - currentY);
        const cornerDistance = Math.hypot(corner.x - currentX, corner.y - currentY);
        return cornerDistance < nearestDistance ? corner : nearest;
      });

      setIsSnapping(true);
      positionRef.current = nearestCorner;
      setPosition(nearestCorner);
      snapTimeoutRef.current = null;
    }, 3000);
  };

  useEffect(() => () => clearSnapTimeout(), []);

  useEffect(() => () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Entering another lesson starts a fresh teacher context so answers cannot
  // accidentally mix the previous lesson with the new one.
  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setTutorMode('tutor');
      setMessages([]);
      setInput('');
      void stopSpeech();
    }, 0);
    return () => window.clearTimeout(resetTimer);
  }, [activeLesson?.lessonTitle]);

  // A language change starts a clean conversation so the teacher does not mix
  // two response languages in the same learning session.
  useEffect(() => {
    if (previousLanguageRef.current === language) return;
    previousLanguageRef.current = language;
    setMessages([]);
    setInput('');
    setVoiceError(null);
    void stopSpeech();
  }, [language]);

  // Keep the chat window inside the visible viewport when the mobile keyboard opens.
  useEffect(() => {
    const visualViewport = window.visualViewport;
    const updateViewport = () => {
      setViewport({
        width: visualViewport?.width ?? window.innerWidth,
        height: visualViewport?.height ?? window.innerHeight,
        offsetTop: visualViewport?.offsetTop ?? 0,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('scroll', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isOpen) return;
    clearSnapTimeout();
    setIsSnapping(false);
    setIsDragging(true);
    didDragRef.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: position.x,
      initialY: position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      const deltaX = clientX - dragRef.current.startX;
      const deltaY = clientY - dragRef.current.startY;

      if (Math.hypot(deltaX, deltaY) > 6) {
        didDragRef.current = true;
      }

      // A touch gesture that started on the bubble belongs to the bubble,
      // not the document. This prevents the browser pull-to-refresh gesture
      // while leaving nearby page pulls completely untouched.
      if ('touches' in e) {
        e.preventDefault();
      }
      
      const newPosition = {
        x: Math.min(Math.max(20, dragRef.current.initialX + deltaX), window.innerWidth - 68),
        y: Math.min(Math.max(20, dragRef.current.initialY + deltaY), window.innerHeight - 68),
      };

      positionRef.current = newPosition;
      setPosition(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (didDragRef.current) {
        scheduleCornerSnap();
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseup', handleMouseUp, { passive: true });
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp, { passive: true });
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const speakResponse = async (text: string) => {
    if (!isSpeechEnabled) return;

    try {
      await speakText(text);
    } catch (error) {
      // Speech failure must never turn a successful AI response into a chat
      // failure. Keep the response visible and log the device-side cause.
      console.warn('AI voice output unavailable:', error);
    }
  };

  const changeTutorMode = (nextMode: TutorMode) => {
    if (nextMode === tutorMode) return;
    setTutorMode(nextMode);
    setMessages([]);
    setInput('');
    setVoiceError(null);
    void stopSpeech();
  };

  const submitMessage = async (messageText: string) => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || isLoading || isTranscribing) return;

    const userMessage: Message = { role: 'user', content: trimmedMessage };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput('');
    setVoiceError(null);
    setIsLoading(true);

    try {
      const responseLanguage: TutorLanguage = language === 'am' ? 'Amharic' : 'English';
      const response = await getGroqChatCompletion(
        newMessages,
        activeLesson
          ? {
              tutorContext: {
                topicTitle: activeLesson.topicTitle,
                lessonTitle: activeLesson.lessonTitle,
                lessonContent: activeLesson.lessonContent,
                mode: tutorMode,
                language: responseLanguage,
              },
            }
          : { language: responseLanguage },
      );
      setMessages([...newMessages, { role: 'assistant', content: response }]);
      void speakResponse(response);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, { role: 'assistant', content: translate('chatError') }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMessage(input);
  };

  const stopMediaStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  };

  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const startVoiceRecording = async () => {
    if (isLoading || isTranscribing || isRecording) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
              setVoiceError(translate('voiceRecordingUnsupported'));

      return;
    }

    setVoiceError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const supportedMimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
      ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
      const recorder = supportedMimeType
        ? new MediaRecorder(stream, { mimeType: supportedMimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const recording = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        stopMediaStream();
        setIsRecording(false);
        recordingChunksRef.current = [];

        if (recording.size <= 0) {
          setVoiceError(translate('noAudioRecorded'));
          return;
        }

        setIsTranscribing(true);
        void transcribeVoiceRecording(recording)
          .then((transcribedText) => submitMessage(transcribedText))
          .catch((error: unknown) => {
            console.error('Voice transcription error:', error);
            setVoiceError(error instanceof Error ? error.message : translate('voiceTranscriptionFailed'));
          })
          .finally(() => setIsTranscribing(false));
      };

      recorder.onerror = () => {
        stopMediaStream();
        setIsRecording(false);
        setVoiceError(translate('microphoneRecordingFailed'));
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      stopMediaStream();
      setIsRecording(false);
      const errorName = error instanceof DOMException ? error.name : '';
      setVoiceError(errorName === 'NotAllowedError'
        ? translate('micPermissionRequired')
        : translate('microphoneUnavailable'));
    }
  };

  const toggleSpeech = () => {
    if (isSpeechEnabled) {
      void stopSpeech();
    }
    setIsSpeechEnabled((enabled) => !enabled);
  };

  // Calculate a centered chat window inside the currently visible viewport.
  // visualViewport.height shrinks when the mobile keyboard opens.
  const getChatWindowStyle = () => {
    const padding = 12;
    const chatWidth = Math.min(400, Math.max(0, viewport.width - padding * 2));
    const chatHeight = Math.min(500, Math.max(0, viewport.height - padding * 2));
    const left = Math.max(padding, (viewport.width - chatWidth) / 2);
    const top = viewport.offsetTop + Math.max(padding, (viewport.height - chatHeight) / 2);

    return {
      position: 'fixed' as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${chatWidth}px`,
      height: `${chatHeight}px`,
      maxHeight: `calc(100dvh - ${padding * 2}px)`,
      zIndex: 50,
    };
  };

  return (
    <div 
      className="fixed z-50"
      style={{ 
        left: position.x, 
        top: position.y,
        transition: isSnapping ? 'left 500ms cubic-bezier(0.22, 1, 0.36, 1), top 500ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
      }}
    >
      {/* Chat Window */}
      {isOpen && (
        <div 
          className="absolute w-full max-w-[400px] min-h-0 bg-slate-900 dark:bg-slate-900 light-theme:bg-[#f8fafc] backdrop-blur-xl border border-white/10 dark:border-white/10 light-theme:border-[#cbd5e1] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
          style={getChatWindowStyle()}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 dark:border-white/10 light-theme:border-[#cbd5e1] bg-white/5 dark:bg-white/5 light-theme:bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white dark:text-white light-theme:text-[#0f172a]">
                  {activeLesson ? `Ethio-Cosmos ${translate('tutor')}` : `Ethio-Cosmos ${translate('teacher')}`}
                </h3>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-400 light-theme:text-slate-600 uppercase tracking-wider font-medium">
                    {activeLesson ? `${languageName} · ${tutorMode === 'quiz' ? translate('quizCoach') : translate('tutor')}` : `${languageName} · ${translate('teacher')}`}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleSpeech}
                aria-label={isSpeechEnabled ? translate('muteAIVoice') : translate('enableAIVoice')}
                className="text-slate-400 hover:text-white hover:bg-white/10"
              >
                {isSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  void stopSpeech();
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {activeLesson && (
            <div className="shrink-0 border-b border-white/10 bg-cyan-500/10 px-4 py-2 dark:border-white/10 light-theme:border-[#cbd5e1] light-theme:bg-cyan-50">
              <div className="mb-2 truncate text-[11px] text-cyan-100 light-theme:text-cyan-900" title={activeLesson.lessonTitle}>
                {translate('currentLesson')}: <span className="font-semibold">{activeLesson.lessonTitle}</span>
              </div>
                              <div className="flex gap-2" role="group" aria-label={translate('teacherMode')}>

                <button
                  type="button"
                  onClick={() => changeTutorMode('tutor')}
                  className={cn(
                    'rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
                    tutorMode === 'tutor' ? 'bg-cyan-600 text-white' : 'bg-white/10 text-cyan-100 hover:bg-white/20 light-theme:bg-white light-theme:text-cyan-800',
                  )}
                  aria-pressed={tutorMode === 'tutor'}
                >
                  {translate('tutor')}
                </button>
                <button
                  type="button"
                  onClick={() => changeTutorMode('quiz')}
                  className={cn(
                    'rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
                    tutorMode === 'quiz' ? 'bg-orange-500 text-white' : 'bg-white/10 text-cyan-100 hover:bg-white/20 light-theme:bg-white light-theme:text-orange-800',
                  )}
                  aria-pressed={tutorMode === 'quiz'}
                >
                  {translate('quizCoach')}
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                </div>
                <h4 className="text-white dark:text-white light-theme:text-[#0f172a] font-medium mb-1">
                  {activeLesson ? translate('teacherReady') : translate('welcome')}
                </h4>
                <p className="text-sm text-slate-400 dark:text-slate-400 light-theme:text-slate-600">
                  {activeLesson ? `${translate('askAboutLesson')} ${activeLesson.lessonTitle}` : translate('askAnything')}
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex flex-col max-w-[85%]",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div 
                  className={cn(
                    "px-4 py-2 rounded-2xl text-sm shadow-md",
                    msg.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none shadow-blue-500/20" 
                      : "bg-slate-800 dark:bg-slate-800 light-theme:bg-white text-white dark:text-white light-theme:text-[#0f172a] rounded-tl-none border border-white/10 dark:border-white/10 light-theme:border-[#cbd5e1] light-theme:shadow-md"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start mr-auto">
                <div className="bg-slate-800 dark:bg-slate-800 light-theme:bg-white text-slate-200 dark:text-slate-200 light-theme:text-[#0f172a] px-4 py-2 rounded-2xl rounded-tl-none border border-white/5 dark:border-white/5 light-theme:border-[#cbd5e1]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="shrink-0 p-3 sm:p-4 border-t border-white/10 dark:border-white/10 light-theme:border-[#cbd5e1] bg-white/5 dark:bg-white/5 light-theme:bg-slate-100">
            {(isRecording || isTranscribing || voiceError) && (
              <div className="mb-2 text-[11px] text-slate-300 dark:text-slate-300 light-theme:text-slate-600" role="status">
                {isRecording ? translate('listeningStatus') : isTranscribing ? translate('transcribingStatus') : voiceError}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                size="icon"
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                disabled={isLoading || isTranscribing}
                aria-label={isRecording ? translate('stopVoiceRecording') : translate('startVoiceRecording')}
                className={cn(
                  'text-white shrink-0',
                  isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-violet-600 hover:bg-violet-500',
                )}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activeLesson && tutorMode === 'quiz' ? translate('answerOrHint') : activeLesson ? translate('askAboutLesson') : translate('askYourTeacher')}
                className="bg-slate-800/50 dark:bg-slate-800/50 light-theme:bg-white border-white/10 dark:border-white/10 light-theme:border-[#cbd5e1] text-white dark:text-white light-theme:text-[#0f172a] placeholder:text-slate-500 light-theme:placeholder:text-slate-400 focus:ring-blue-500"
                disabled={isLoading || isRecording || isTranscribing}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading || isRecording || isTranscribing}
                className="bg-blue-600 hover:bg-blue-500 text-white shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Toggle Button - 3D Ball */}
      {!isOpen && (
        <div
          className="relative w-14 h-14 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onClick={() => {
            if (!didDragRef.current && !isDragging) {
              setIsOpen(true);
            }
            didDragRef.current = false;
          }}
          style={{
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.7)) drop-shadow(0 10px 20px rgba(0, 0, 0, 0.5))'
          }}
        >
          {/* Ball base with spectrum animation */}
          <div
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group relative overflow-visible",
              "animate-spectrum-rainbow",
              !isDragging && "animate-float"
            )}
            style={{
              animation: 'spectrum-rainbow 35s linear infinite',
              boxShadow: `
                inset -3px -3px 8px rgba(0, 0, 0, 0.4),
                inset 3px 3px 8px rgba(255, 255, 255, 0.15),
                inset -1px -1px 3px rgba(0, 0, 0, 0.5)
              `,
              willChange: 'transform',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
          >
            {/* Glossy highlight - top left */}
            <div 
              className="absolute top-1.5 left-1.5 w-[18px] h-[18px] rounded-full pointer-events-none opacity-70"
              style={{
                background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.5), rgba(255,255,255,0.1) 50%, transparent 70%)',
                boxShadow: '0 2px 4px rgba(255, 255, 255, 0.2)'
              }}
            />
            
            {/* Secondary highlight - subtle */}
            <div 
              className="absolute top-2.5 right-2.5 w-[10px] h-[10px] rounded-full pointer-events-none opacity-40"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)'
              }}
            />

            {/* Icon */}
            <Sparkles 
              className={cn(
                "w-6 h-6 text-white group-hover:rotate-12 transition-transform relative z-10",
                "drop-shadow-[0_0_15px_rgba(0,255,255,1)]"
              )} 
              style={{
                filter: 'drop-shadow(0 0 10px cyan) drop-shadow(0 0 20px cyan)',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
              }}
            />
          </div>

          {/* Soft ground shadow */}
          <div
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1.5 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.3), transparent 70%)',
              filter: 'blur(4px)'
            }}
          />
        </div>
      )}
    </div>
  );
}

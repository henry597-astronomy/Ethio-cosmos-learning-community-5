import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, Sparkles, X, MessageSquare, Loader2 } from 'lucide-react';
import { getGroqChatCompletion, type Message } from '@/services/groq';
import { cn } from '@/lib/utils';

export default function AIChatBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Draggable state
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isOpen) return;
    setIsDragging(true);
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
      
      const newX = Math.min(Math.max(20, dragRef.current.initialX + deltaX), window.innerWidth - 80);
      const newY = Math.min(Math.max(20, dragRef.current.initialY + deltaY), window.innerHeight - 80);
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getGroqChatCompletion(newMessages);
      setMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate chat window position to stay on screen and be centered
  const getChatWindowStyle = () => {
    const chatWidth = 350;
    const chatHeight = 500;
    const padding = 16;
    
    // Calculate available space
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;
    
    // Center the chat window on screen
    const centerLeft = (availableWidth - chatWidth) / 2;
    const centerTop = (availableHeight - chatHeight) / 2;
    
    // Ensure minimum padding from edges
    const left = Math.max(padding, Math.min(centerLeft, availableWidth - chatWidth - padding));
    const top = Math.max(padding, Math.min(centerTop, availableHeight - chatHeight - padding));

    return {
      position: 'fixed' as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${chatWidth}px`,
      height: `${chatHeight}px`,
      zIndex: 50,
    };
  };

  return (
    <div 
      className="fixed z-50"
      style={{ 
        left: position.x, 
        top: position.y,
        transition: 'none'
      }}
    >
      {/* Chat Window */}
      {isOpen && (
        <div 
          className="absolute w-[350px] sm:w-[400px] h-[500px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
          style={getChatWindowStyle()}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Ethio-Cosmos AI</h3>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Online</span>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon-sm" 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                </div>
                <h4 className="text-white font-medium mb-1">Welcome to Ethio-Cosmos!</h4>
                <p className="text-sm text-slate-400">Ask me anything about astronomy or our community.</p>
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
                    "px-4 py-2 rounded-2xl text-sm",
                    msg.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : "bg-slate-800 text-slate-200 rounded-tl-none border border-white/5"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start mr-auto">
                <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-2xl rounded-tl-none border border-white/5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-white/5">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:ring-blue-500"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || isLoading}
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
          className="relative w-16 h-16 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onClick={() => !isDragging && setIsOpen(true)}
          style={{
            filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.7)) drop-shadow(0 10px 20px rgba(0, 0, 0, 0.5))'
          }}
        >
          {/* Ball base with spectrum animation */}
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group relative overflow-visible",
              "animate-spectrum-rainbow",
              !isDragging && "animate-float"
            )}
            style={{
              animation: 'spectrum-rainbow 35s linear infinite',
              boxShadow: `
                inset -3px -3px 8px rgba(0, 0, 0, 0.4),
                inset 3px 3px 8px rgba(255, 255, 255, 0.15),
                inset -1px -1px 3px rgba(0, 0, 0, 0.5)
              `
            }}
          >
            {/* Glossy highlight - top left */}
            <div 
              className="absolute top-2 left-2 w-5 h-5 rounded-full pointer-events-none opacity-70"
              style={{
                background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.5), rgba(255,255,255,0.1) 50%, transparent 70%)',
                boxShadow: '0 2px 4px rgba(255, 255, 255, 0.2)'
              }}
            />
            
            {/* Secondary highlight - subtle */}
            <div 
              className="absolute top-3 right-3 w-3 h-3 rounded-full pointer-events-none opacity-40"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)'
              }}
            />

            {/* Icon */}
            <Sparkles 
              className={cn(
                "w-7 h-7 text-white group-hover:rotate-12 transition-transform relative z-10",
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
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-14 h-2 rounded-full pointer-events-none"
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

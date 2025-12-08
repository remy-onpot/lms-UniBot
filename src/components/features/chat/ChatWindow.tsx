'use client';
import { useRef, useEffect, useState } from 'react';
import { Send, Loader2, User, Sparkles, ArrowDown } from 'lucide-react';
import { UniBotFace } from '@/components/ui/UniBotFace';
import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  documentTitle?: string;
}

export function ChatWindow({ messages = [], isLoading, onSendMessage, documentTitle }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(atBottom);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  // Simple Markdown Parser (Bold **text**, Newlines)
  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => (
      <p key={i} className="min-h-[1em] mb-1 last:mb-0">
        {line.split(/(\*\*.*?\*\*)/).map((part, j) => 
          part.startsWith('**') && part.endsWith('**') ? 
          <strong key={j}>{part.slice(2, -2)}</strong> : part
        )}
      </p>
    ));
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      <div className="p-4 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
             <UniBotFace size="sm" state={isLoading ? 'thinking' : 'idle'} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm truncate">UniBot Tutor</h3>
            <p className="text-xs text-slate-500 truncate">
              {documentTitle ? `Chatting with: ${documentTitle}` : 'Ask me anything about this doc'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth" onScroll={handleScroll}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
             <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-indigo-400" />
             </div>
             <p className="font-bold text-slate-700">No messages yet</p>
             <p className="text-sm text-slate-500 max-w-xs mt-2">
               Ask questions like "Summarize this chapter" or "What is the main concept on page 5?"
             </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-4 max-w-3xl", msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm", msg.role === 'user' ? "bg-slate-900 border-slate-900" : "bg-white border-indigo-100")}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : 
                <UniBotFace size="sm" state={msg.isStreaming ? 'thinking' : 'idle'} /> // ✅ Fixed state
              }
            </div>
            <div className={cn("p-4 rounded-2xl text-sm leading-relaxed shadow-sm max-w-[85%]", msg.role === 'user' ? "bg-slate-900 text-white rounded-tr-none" : "bg-white border border-slate-100 text-slate-700 rounded-tl-none")}>
              {renderContent(msg.content)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4 mr-auto">
             <div className="w-8 h-8 rounded-full bg-white border border-indigo-100 flex items-center justify-center shrink-0">
               <UniBotFace size="sm" state="thinking" />
             </div>
             <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="text-xs font-bold text-slate-500">Thinking...</span>
             </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      
      {!isAtBottom && (
        <button onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })} className="absolute bottom-24 right-6 bg-slate-900 text-white p-2 rounded-full shadow-lg hover:bg-slate-800 transition z-20">
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-inner">
          <textarea ref={textareaRef} value={input} onChange={handleInput} onKeyDown={handleKeyDown} placeholder="Ask UniBot anything..." className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 text-sm p-2 text-slate-900 placeholder:text-slate-400" rows={1} disabled={isLoading} />
          <button onClick={() => handleSubmit()} disabled={!input.trim() || isLoading} className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md mb-0.5">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
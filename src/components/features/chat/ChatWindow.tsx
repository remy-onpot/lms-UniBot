'use client';
import { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, ArrowDown, User } from 'lucide-react';
import { UniBotMascot } from '@/components/ui/UniBotMascot';
import { UniBotFace } from '@/components/ui/UniBotFace';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Typewriter Helper ---
const TypewriterEffect = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert wrap-break-word">
  <ReactMarkdown
      components={{
          a: ({node, ...props}: any) => <a target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" {...props} />,
          code: ({node, className, children, ...props}: any) => {
              const match = /language-(\w+)/.exec(className || '')
              return match ? (
                  <code className="block bg-slate-800 text-white p-2 rounded-lg my-2 overflow-x-auto text-xs font-mono" {...props}>{children}</code>
              ) : (
                  <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs" {...props}>{children}</code>
              )
          }
      }}
    >
      
    {content}
  </ReactMarkdown>
</div>
)};

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
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto-scroll on new message
  useEffect(() => {
    if (!bottomRef.current) return;
    const parent = bottomRef.current.parentElement;
    if (!parent) return;
    const isNearBottom = parent.scrollHeight - parent.scrollTop - parent.clientHeight < 150;
    if (isNearBottom || messages[messages.length - 1]?.role === 'user') {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200);
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

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 relative">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-white/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
             <UniBotFace size="sm" state={isLoading ? 'thinking' : 'idle'} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm truncate">UniBot Tutor</h3>
            <p className="text-xs text-slate-500 truncate">
              {documentTitle ? `Context: ${documentTitle}` : 'Ask me anything'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth" onScroll={handleScroll}>
        
        {/* EMPTY STATE */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
             <div className="mb-6 scale-110">
                <UniBotMascot size={150} emotion="happy" action="wave" />
             </div>
             <p className="font-black text-slate-900 text-xl">I'm ready!</p>
             <p className="text-sm text-slate-500 max-w-xs mt-2">
               Ask me to summarize, generate a quiz, or explain complex topics.
             </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-4 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm mt-1", msg.role === 'user' ? "bg-slate-900 border-slate-900" : "bg-white border-indigo-100")}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <UniBotFace size="sm" state="happy" />}
            </div>
            
            <div className={cn("p-4 rounded-2xl text-sm leading-relaxed shadow-sm max-w-[85%] overflow-hidden", 
                msg.role === 'user' ? "bg-slate-900 text-white rounded-tr-none" : "bg-white border border-slate-100 text-slate-700 rounded-tl-none")}>
              <TypewriterEffect content={msg.content} />
            </div>
          </div>
        ))}

        {/* LOADING STATE: Thinking Mascot */}
        {isLoading && (
          <div className="flex flex-col gap-2 mr-auto animate-in fade-in slide-in-from-bottom-2">
             <div className="flex items-end gap-3">
                <div className="mb-1">
                   <UniBotMascot size={60} emotion="thinking" action="dance" />
                </div>
                
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl rounded-bl-none">
                   <div className="flex gap-1">
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                   </div>
                </div>
             </div>
             <p className="text-[10px] text-slate-400 font-bold ml-16">UniBot is reading...</p>
          </div>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>
      
      {showScrollButton && (
        <button 
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })} 
            className="absolute bottom-24 right-6 bg-slate-900 text-white p-3 rounded-full shadow-xl hover:bg-slate-800 transition-all z-20 animate-bounce"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-inner">
          <textarea 
            ref={textareaRef} 
            value={input} 
            onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
            }} 
            onKeyDown={handleKeyDown} 
            placeholder="Ask UniBot anything..." 
            className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 text-sm p-2 text-slate-900 placeholder:text-slate-400" 
            rows={1} 
            disabled={isLoading} 
          />
          <button 
            onClick={() => handleSubmit()} 
            disabled={!input.trim() || isLoading} 
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md mb-0.5"
          >
            {isLoading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
'use client';
import { useRef, useEffect, useState } from 'react';
import { Send, Paperclip, X, Sparkles, User } from 'lucide-react';
import { UniBotMascot } from '@/components/ui/UniBotMascot';
import { UniBotFace } from '@/components/ui/UniBotFace'; // Assuming you have this
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string, files: File[]) => void;
  documentTitle?: string;
  attachments: File[];
  setAttachments: (files: File[]) => void;
}

export function ChatWindow({ 
  messages = [], 
  isLoading, 
  onSendMessage, 
  attachments,
  setAttachments 
}: ChatWindowProps) {
  
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setAttachments([...attachments, ...Array.from(e.target.files)]);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    onSendMessage(input, attachments);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full relative bg-slate-50">
      
      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        
        {/* EMPTY STATE - Matches your "Get Started" image */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-500">
             <div className="mb-8 scale-125">
                {/* 🤖 THE MASCOT (Replacing the image robot) */}
                <UniBotMascot size={180} emotion="happy" action="wave" />
             </div>
             
             <div className="space-y-2 max-w-xs mx-auto">
               <div className="bg-white px-6 py-3 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 text-left">
                 <p className="text-slate-800 font-medium text-sm">
                   Hey there! I'm UniBot. <br/>
                   <span className="text-slate-400 text-xs">Ready to analyze this document?</span>
                 </p>
               </div>
             </div>
          </div>
        )}

        {/* CHAT BUBBLES */}
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3 max-w-[85%] md:max-w-2xl animate-in slide-in-from-bottom-2", msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
            
            {/* Avatar */}
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-auto mb-1", msg.role === 'user' ? "bg-slate-900 border-slate-900" : "bg-white border-indigo-100 shadow-sm")}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <UniBotFace size="xs" state="happy" />}
            </div>
            
            {/* Bubble */}
            <div className="flex flex-col gap-1">
               {/* Images */}
               {msg.images && msg.images.length > 0 && (
                 <div className="flex gap-2 mb-1 flex-wrap justify-end">
                   {msg.images.map((img, i) => (
                     <img key={i} src={img} alt="attachment" className="h-32 w-auto rounded-xl border border-slate-200 object-cover" />
                   ))}
                 </div>
               )}

               {/* Text */}
               <div className={cn("px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm", 
                  msg.role === 'user' 
                    ? "bg-slate-900 text-white rounded-br-sm" 
                    : "bg-white text-slate-800 border border-slate-100 rounded-bl-sm")}>
                 <ReactMarkdown>{msg.content}</ReactMarkdown>
               </div>
            </div>
          </div>
        ))}

        {/* LOADING STATE */}
        {isLoading && (
          <div className="flex items-center gap-3 mr-auto max-w-[80%] animate-pulse">
             <div className="w-8 h-8 bg-white border border-indigo-100 rounded-full flex items-center justify-center shadow-sm">
                <UniBotFace size="xs" state="thinking" />
             </div>
             <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm border border-slate-100 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                </div>
             </div>
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* INPUT AREA - Styled like the reference (Floating Pill) */}
      <div className="p-4 bg-transparent sticky bottom-0 z-10">
        
        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3 px-2 overflow-x-auto">
            {attachments.map((file, i) => (
              <div key={i} className="relative group shrink-0">
                <img src={URL.createObjectURL(file)} alt="preview" className="h-16 w-16 object-cover rounded-xl border-2 border-white shadow-md" />
                <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Floating Input Container */}
        <div className="bg-white p-2 rounded-4xl shadow-xl border border-slate-100 flex items-end gap-2 max-w-4xl mx-auto">
          
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask a question..." 
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 text-sm py-3 text-slate-800 placeholder:text-slate-400"
            rows={1}
            style={{ minHeight: '44px' }}
          />

          <button 
            onClick={() => handleSubmit()} 
            disabled={(!input.trim() && attachments.length === 0) || isLoading} 
            className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full disabled:opacity-50 disabled:scale-95 transition-all shadow-md transform hover:scale-105 active:scale-95"
          >
            {isLoading ? <Sparkles className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
          </button>
        </div>
        <div className="text-center mt-2">
           <p className="text-[10px] text-slate-400">UniBot can make mistakes. Verify important info.</p>
        </div>
      </div>
    </div>
  );
}
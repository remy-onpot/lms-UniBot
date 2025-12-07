import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '@/types';
import { useFace } from '@/components/ui/FaceProvider';
import { FaceAnalyticsService } from '@/lib/services/face-analytics.service';
import { UniBotFace } from '@/components/ui/UniBotFace';

interface ChatWindowProps {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  onInputChange: (val: string) => void;
  onSend: (e: React.FormEvent) => void;
}

export function ChatWindow({ messages, input, isLoading, onInputChange, onSend }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const face = useFace();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      face.setState('thinking');
      FaceAnalyticsService.recordFaceEvent({
        eventType: 'chat_loading',
        faceState: 'thinking',
        metadata: { message_count: messages.length }
      }).catch(e => console.error('[Chat] Failed to log:', e));
    } else {
      face.setState('idle');
    }
  }, [isLoading, face]);

  return (
    <div className="flex flex-1 flex-col bg-white h-screen">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {messages.length === 0 && !isLoading && (
          <div className="flex h-full flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">AI Document Assistant</h3>
            <p className="text-gray-500 text-sm max-w-xs">
              Ask me anything about this document. I can explain concepts, summarize sections, or find specific details.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {/* UniBot avatar on left for assistant/system messages */}
            {m.role === 'assistant' && (
              <div className="shrink-0 mt-1">
                <UniBotFace size="sm" />
              </div>
            )}

            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-sm ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none ml-auto' 
                : m.role === 'system' ? 'bg-red-50 text-red-600 border border-red-100'
                : 'bg-gray-100 text-gray-800 rounded-bl-none'
            }`}>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>

            {/* Small user avatar on right for user messages */}
            {m.role === 'user' && (
              <div className="shrink-0 mt-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                ME
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={onSend} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()} 
            className="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatPage() {
  const params = useParams();
 const materialId = params?.materialId as string; // Match the [materialId] folder name
  const router = useRouter();
  const [material, setMaterial] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  console.log('🔍 Chat params:', params);
  console.log('🔍 Material ID:', materialId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchMaterial = async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', materialId)
        .single();
      
      if (error) {
        console.log('Material load error', error);
      } else {
        setMaterial(data);
      }
    };
    fetchMaterial();
  }, [materialId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: input 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          documentContext: material?.content_text 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API Error');
      }
      
      if (!response.body) return;

      const aiMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { 
        id: aiMsgId, 
        role: 'assistant', 
        content: '' 
      }]);

      // ✅ FIX: Use accumulated text instead of appending
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = ''; // Accumulate here
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          const chunkValue = decoder.decode(value, { stream: true });
          accumulatedText += chunkValue; // Add to accumulated text
          
          // Update with FULL accumulated text, not appending
          setMessages(prev => {
            const newMessages = [...prev];
            const targetIndex = newMessages.findIndex(msg => msg.id === aiMsgId);
            if (targetIndex !== -1) {
              newMessages[targetIndex].content = accumulatedText; // SET, don't append
            }
            return newMessages;
          });
        }
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!material) return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading document...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-gray-50 md:flex-row">
      
      {/* LEFT PANEL: PDF VIEWER */}
      <div className="hidden w-1/2 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <button 
            onClick={() => router.back()} 
            className="text-sm font-bold text-gray-500 hover:text-gray-900"
          >
            ← Back
          </button>
          <h2 className="truncate font-bold text-gray-800">{material.title}</h2>
          <a 
            href={material.file_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Download
          </a>
        </div>
        <div className="flex-1 bg-gray-100 p-4">
          <iframe 
            src={material.file_url} 
            className="h-full w-full rounded-lg border border-gray-300 shadow-sm" 
            title="PDF Viewer" 
          />
        </div>
      </div>

      {/* RIGHT PANEL: CHAT */}
      <div className="flex flex-1 flex-col bg-white">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Empty State - Shows when no messages */}
          {messages.length === 0 && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">💬</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI Document Assistant</h3>
              <p className="text-gray-600 max-w-md">
                Ask me anything about this document. I can help explain concepts, summarize sections, or answer specific questions.
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((m) => (
            <div 
              key={m.id} 
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm text-sm ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-xs text-gray-500">Thinking...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about this document..."
              className="flex-1 rounded-lg border border-gray-300 p-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()} 
              className="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
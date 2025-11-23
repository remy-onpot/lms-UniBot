'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define Message Type locally
type Message = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export default function GlobalAssistantPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const initialMessage = "Hello! I am UniBot, your Global University Assistant. I'm ready to help you navigate the platform and answer general academic questions.";

  // --- MANUAL STATE MANAGEMENT ---
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: initialMessage }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Manual Send Handler (Robust fetch logic)
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // A. Add User Message to UI
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    
    setInput('');
    setIsLoading(true);

    try {
      // B. Call API with ALL messages (including the new user message)
      console.log("🚀 Sending to API:", [...messages, userMsg]);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg], // Send complete history with IDs
          documentContext: null 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unknown API Error');
      }
      
      if (!response.body) return;

      // C. Prepare AI Message UI
      const aiMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '' }]);

      // D. Read the Stream manually
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = ''; // Accumulate all chunks here

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          const chunkValue = decoder.decode(value, { stream: true });
          accumulatedText += chunkValue; // Add to accumulated text
          
          console.log('📦 Frontend received chunk:', chunkValue.substring(0, 50));

          // Update AI message with accumulated text (not appending chunk again)
          setMessages((prev: Message[]) => {
            const newMessages = [...prev];
            const targetIndex = newMessages.findIndex(msg => msg.id === aiMsgId);
            if (targetIndex !== -1) {
              // Set the FULL accumulated text, don't append
              newMessages[targetIndex].content = accumulatedText;
            }
            return newMessages;
          });
        }
      }
      
      console.log('✅ Frontend stream complete. Total text length:', accumulatedText.length);

    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'system', 
        content: `❌ Error: ${error.message || "Failed to send message."}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className="flex h-screen flex-col bg-gray-50 pt-20">
      
      {/* Top Header */}
      <div className="bg-white shadow-md border-b border-gray-200 sticky top-0 w-full z-10 pt-16 md:pt-0">
        <div className="mx-auto max-w-4xl px-4 py-3">
            <h1 className="text-xl font-bold text-gray-800">
                🌐 Global Assistant Chat
            </h1>
            <p className="text-sm text-gray-500">Ask general questions about the platform.</p>
        </div>
      </div>

      {/* RIGHT PANEL: CHAT */}
      <div className="flex flex-1 flex-col bg-white">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-24 md:pt-4">
          
          {/* Messages List */}
          {messages.map((m: Message) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm text-sm ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : m.role === 'system' ? 'bg-red-50 text-red-600 border border-red-100' // System error style
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
             <div className="flex justify-start">
               <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3 text-xs text-gray-500 animate-pulse">Thinking...</div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Type your question here..."
              className="flex-1 rounded-lg border border-gray-300 p-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()} 
              className="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700 disabled:bg-gray-300"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
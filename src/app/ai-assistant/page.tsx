'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { ChatService } from '../../lib/services/chat.service';
import { useAIChat } from '../../hooks/useAIChat';
import { ChatWindow } from '../../components/features/chat/ChatWindow';

export default function GlobalAssistantPage() {
  const router = useRouter();
  
  // State
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Hook
  // documentContext is null because this is the global assistant
  const { messages, setMessages, input, setInput, isLoading, sendMessage } = useAIChat(
    null, 
    userId || undefined,
    sessionId || undefined
  );

  useEffect(() => {
    initGlobalChat();
  }, []);

  const initGlobalChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      setUserId(user.id);

      // Check for an existing "General" session (one without a material_id)
      const sessions = await ChatService.getUserSessions(user.id);
      const generalSession = sessions.find(s => !s.material_id); 

      if (generalSession) {
        setSessionId(generalSession.id);
        const history = await ChatService.getSessionMessages(generalSession.id);
        setMessages(history);
      } 
      // If no session exists, the hook will create one automatically on the first message

    } catch (error) {
      console.error("Failed to load chat:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 w-full z-10 px-4 py-3 flex justify-between items-center">
        <div>
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                🤖 UniBot Global Assistant
            </h1>
            <p className="text-xs text-gray-500">Ask general questions about your studies.</p>
        </div>
        <button onClick={() => router.back()} className="text-sm font-medium text-gray-500 hover:text-gray-900">
            Close
        </button>
      </div>

      {/* Reused Chat Window Component */}
      <div className="flex-1 overflow-hidden relative">
        <ChatWindow 
            messages={messages}
            input={input}
            isLoading={isLoading}
            onInputChange={setInput}
            onSend={(e) => { e.preventDefault(); sendMessage(input); }}
        />
      </div>
    </div>
  );
}
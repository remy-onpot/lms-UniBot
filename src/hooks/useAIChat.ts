import { useState, useCallback } from 'react';
import { ChatService } from '../lib/services/chat.service'; // Relative path
import { ChatMessage } from '../types'; // Relative path

export function useAIChat(
  documentContext?: string | null, 
  userId?: string, 
  initialSessionId?: string,
  materialId?: string // ✅ New param
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId || null);

  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;

    // 1. Optimistic UI Update
    const tempUserMsg: ChatMessage = {
      id: Date.now().toString(),
      session_id: currentSessionId || 'temp',
      role: 'user',
      content: userInput,
      created_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, tempUserMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // 2. Ensure Session Exists (Create if first message)
      let activeSessionId = currentSessionId;
      if (!activeSessionId && userId) {
        // Generate a title
        const title = materialId 
          ? `Chat about Document` 
          : (userInput.slice(0, 30) + (userInput.length > 30 ? '...' : ''));
          
        // ✅ Pass materialId to link session
        const newSession = await ChatService.createSession(userId, title, materialId);
        activeSessionId = newSession.id;
        setCurrentSessionId(activeSessionId);
      }

      // 3. Save User Message to DB
      if (activeSessionId && userId) {
        await ChatService.saveMessage(activeSessionId, 'user', userInput);
      }

      // 4. Call AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.concat(tempUserMsg), // Send context
          documentContext,
        }),
      });

      if (!response.ok) throw new Error('API Error');
      if (!response.body) return;

      // 5. Stream Response
      const aiMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { 
        id: aiMsgId, 
        session_id: activeSessionId || 'temp',
        role: 'assistant', 
        content: '',
        created_at: new Date().toISOString()
      }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        setMessages(prev => {
          const newMsgs = [...prev];
          const index = newMsgs.findIndex(m => m.id === aiMsgId);
          if (index !== -1) newMsgs[index].content = accumulatedText;
          return newMsgs;
        });
      }

      // 6. Save AI Response to DB
      if (activeSessionId && userId) {
        await ChatService.saveMessage(activeSessionId, 'assistant', accumulatedText);
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        session_id: currentSessionId || 'temp',
        role: 'system',
        content: `Error: ${error.message}`,
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, documentContext, userId, currentSessionId, materialId]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    sendMessage,
    currentSessionId
  };
}
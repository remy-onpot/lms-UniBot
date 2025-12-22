import { useState, useCallback, useEffect } from 'react';
import { ChatMessage } from '../types';
import { useSync } from '@/components/providers/SyncProvider';
import { db } from '@/lib/db';
import { sendMessageAction, loadChatSessionAction } from '@/app/actions/chat.actions';

export function useAIChat(
  documentContext?: string | null, 
  userId?: string, 
  materialId?: string
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const { isOnline } = useSync();

  // ------------------------------------------------------------------
  // 1. Load History on Mount (Server Action)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!userId || !materialId) return;

    const loadHistory = async () => {
      try {
        const { sessionId, history } = await loadChatSessionAction(userId, materialId);
        if (sessionId) {
          setCurrentSessionId(sessionId);
          setMessages(history as ChatMessage[]);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };

    if (isOnline) {
      loadHistory();
    }
  }, [userId, materialId, isOnline]);

  // Helper: Convert File to Base64 for API
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // ------------------------------------------------------------------
  // 2. Send Message Logic
  // ------------------------------------------------------------------
  const sendMessage = useCallback(async (userInput: string, files: File[] = []) => {
    if ((!userInput.trim() && files.length === 0) || isLoading) return;
    if (!userId) return; // Guard for strict type safety

    // A. Process Images
    const processedImages = await Promise.all(files.map(async (file) => ({
      inlineData: {
        data: (await fileToBase64(file)).split(',')[1],
        mimeType: file.type
      }
    })));

    // B. Optimistic UI Update
    const tempUserMsg = {
      id: crypto.randomUUID(),
      session_id: currentSessionId || 'temp',
      user_id: userId,
      role: 'user' as const,
      content: userInput,
      created_at: new Date().toISOString(),
      images: files.map(f => URL.createObjectURL(f)) 
    } as ChatMessage;
    
    setMessages(prev => [...prev, tempUserMsg]);
    setInput('');
    setAttachments([]); 
    setIsLoading(true);

    try {
      // 🛑 C. OFFLINE MODE
      if (!isOnline) {
         // Queue to Dexie
         await db.offlineActions.add({
           type: 'chat_message',
           payload: { 
               sessionId: currentSessionId || `offline-${Date.now()}`, 
               role: 'user', 
               content: userInput 
           },
           status: 'pending',
           created_at: new Date().toISOString()
         });

         setMessages(prev => [...prev, {
           id: 'system-offline-' + Date.now(),
           session_id: currentSessionId || '',
           user_id: userId,
           role: 'system',
           content: 'You are offline. Message queued.',
           created_at: new Date().toISOString()
         }]);
         
         setIsLoading(false);
         return;
      }

      // 🟢 D. ONLINE MODE (Server Action)
      const response = await sendMessageAction(
        userId, 
        userInput, 
        messages, 
        materialId, 
        processedImages
      );

      if (response) {
        // Update Session ID if it was created
        if (response.sessionId) {
          setCurrentSessionId(response.sessionId);
        }

        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          session_id: response.sessionId || currentSessionId || 'temp',
          user_id: userId,
          role: 'assistant',
          // ✅ FIX: Removed invalid .message property access
          content: typeof response === 'string' ? response : (response.content || ''),
          created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, aiMsg]);
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        session_id: currentSessionId || 'temp',
        user_id: userId,
        role: 'system',
        content: `Error: ${error.message || "Something went wrong."}`,
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, documentContext, userId, currentSessionId, materialId, isOnline]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    attachments,      
    setAttachments,   
    isLoading,
    sendMessage,
    currentSessionId
  };
}
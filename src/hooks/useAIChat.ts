import { useState, useCallback, useEffect } from 'react';
import { ChatService } from '../lib/services/chat.service'; 
import { ChatMessage } from '../types';
import { useSync } from '@/components/providers/SyncProvider';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

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
  // 1. Load History on Mount (Persistence)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!userId || !materialId) return;

    const loadHistory = async () => {
      try {
        // Check if a session already exists for this material
        const { data: session } = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('material_id', materialId)
          .maybeSingle();

        if (session) {
          setCurrentSessionId(session.id);
          
          // Fetch messages for this session
          const { data: history } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', session.id)
            .order('created_at', { ascending: true });
            
          if (history) setMessages(history as ChatMessage[]);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };

    loadHistory();
  }, [userId, materialId]);

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
  // 2. Send Message Logic (Online + Offline)
  // ------------------------------------------------------------------
  const sendMessage = useCallback(async (userInput: string, files: File[] = []) => {
    if ((!userInput.trim() && files.length === 0) || isLoading) return;

    // A. Process Images (if any)
    const processedImages = await Promise.all(files.map(async (file) => ({
      inlineData: {
        data: (await fileToBase64(file)).split(',')[1], // Remove prefix
        mimeType: file.type
      }
    })));

    // B. Optimistic UI Update (Show message immediately)
    const tempUserMsg: ChatMessage & { images?: string[] } = {
      id: Date.now().toString(),
      session_id: currentSessionId || 'temp',
      role: 'user',
      content: userInput,
      // @ts-ignore - Transient property for UI preview
      images: files.map(f => URL.createObjectURL(f)), 
      created_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, tempUserMsg]);
    setInput('');
    setAttachments([]); 
    setIsLoading(true);

    try {
      // C. Ensure Session Exists
      let activeSessionId = currentSessionId;
      
      // If no session exists, we need one.
      if (!activeSessionId && userId) {
        const title = materialId 
          ? `Chat about Document` 
          : (userInput.slice(0, 30) || "Image Analysis");
          
        if (isOnline) {
            // Online: Create real session
            const newSession = await ChatService.createSession(userId, title, materialId);
            activeSessionId = newSession.id;
            setCurrentSessionId(activeSessionId);
        } else {
            // Offline: Use a temporary ID. We will reconcile this during Sync if possible,
            // or just allow the user to read/write locally until online.
            activeSessionId = `offline-${Date.now()}`;
            setCurrentSessionId(activeSessionId);
        }
      }

      // 🛑 D. OFFLINE MODE CHECK
      if (!isOnline && activeSessionId && userId) {
         // Queue the User Message to Dexie
         await db.offlineActions.add({
            type: 'chat_message',
            payload: { 
                sessionId: activeSessionId, 
                role: 'user', 
                content: userInput 
            },
            status: 'pending',
            created_at: new Date().toISOString()
         });

         // Add System Message to UI to inform user
         setMessages(prev => [...prev, {
            id: 'system-offline-' + Date.now(),
            role: 'system',
            content: 'You are offline. Message queued and will send automatically when connection returns.',
            session_id: activeSessionId || '',
            created_at: new Date().toISOString()
         }]);
         
         setIsLoading(false);
         return; // Stop here
      }

      // 🟢 E. ONLINE MODE
      
      // 1. Save User Message to Database
      if (activeSessionId && userId) {
        // Note: Real apps upload images to storage here. For MVP we skip image persistence in DB.
        await ChatService.saveMessage(activeSessionId, 'user', userInput);
      }

      // 2. Call AI API (The Smart Router)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })), // Send history
          currentMessage: userInput,
          images: processedImages,
          documentContext,
          materialId,
        }),
      });

      if (!response.ok) throw new Error('AI Service Unavailable');
      if (!response.body) return;

      // 3. Prepare AI Response UI
      const aiMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { 
        id: aiMsgId, 
        session_id: activeSessionId || 'temp',
        role: 'assistant', 
        content: '',
        created_at: new Date().toISOString()
      }]);

      // 4. Stream the Response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        // Update UI with chunks
        setMessages(prev => {
          const newMsgs = [...prev];
          const index = newMsgs.findIndex(m => m.id === aiMsgId);
          if (index !== -1) newMsgs[index].content = accumulatedText;
          return newMsgs;
        });
      }

      // 5. Save AI Response to Database
      if (activeSessionId && userId) {
        await ChatService.saveMessage(activeSessionId, 'assistant', accumulatedText);
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        session_id: currentSessionId || 'temp',
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
'use client';

import { useAIChat } from "@/hooks/useAIChat";
import { ChatWindow } from "@/components/features/chat/ChatWindow";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AssistantPage() {
  const [userId, setUserId] = useState<string>("");
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
        if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { 
    messages, 
    isLoading, 
    sendMessage,
    attachments,
    setAttachments 
  } = useAIChat(null, userId);

  // ✅ FIX: Map messages to ensure Role matches 'user' | 'assistant'
  const displayMessages = messages.map(m => ({
    ...m,
    role: (m.role === 'system' ? 'assistant' : m.role) as 'user' | 'assistant'
  }));

  // ✅ FIX: Add type annotation to event
  const handleSend = (text: string, files: File[]) => {
    sendMessage(text, files);
  };

  return (
    <div className="h-screen w-full flex flex-col">
      <ChatWindow 
        messages={displayMessages} 
        isLoading={isLoading} 
        onSendMessage={handleSend}
        documentTitle="General Assistant"
        attachments={attachments}
        setAttachments={setAttachments}
      />
    </div>
  );
}
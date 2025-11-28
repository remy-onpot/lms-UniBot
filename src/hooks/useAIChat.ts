import { useState, useCallback } from 'react';

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export function useAIChat(documentContext?: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
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
          documentContext,
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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkValue = decoder.decode(value, { stream: true });
        accumulatedText += chunkValue;

        setMessages(prev => {
          const newMessages = [...prev];
          const targetIndex = newMessages.findIndex(msg => msg.id === aiMsgId);
          if (targetIndex !== -1) {
            newMessages[targetIndex].content = accumulatedText;
          }
          return newMessages;
        });
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `Error: ${error.message}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, documentContext]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
  };
}
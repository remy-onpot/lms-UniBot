'use server';

import { createClient } from '@/lib/supabase/server';
import { ChatService } from '@/lib/services/chat.service';

export async function sendMessageAction(
  userId: string, 
  message: string, 
  history: any[], 
  materialId?: string,
  images?: { inlineData: { data: string; mimeType: string } }[]
) {
  // ✅ FIXED: No arguments allowed here. Added await.
  const supabase = await createClient(); 
  
  const chatService = new ChatService(supabase);

  // Now this will work because we updated chat.service.ts above
  return await chatService.generateResponse(message, history, userId, materialId, images);
}

export async function loadChatSessionAction(userId: string, materialId: string) {
  // ✅ FIXED: No arguments allowed here. Added await.
  const supabase = await createClient();
  
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('material_id', materialId)
    .maybeSingle();

  if (!session) return { sessionId: null, history: [] };

  const { data: history } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true });

  return { sessionId: session.id, history: history || [] };
}
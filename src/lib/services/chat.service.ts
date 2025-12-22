import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

export class ChatService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Generates a response, handling session creation and message saving.
   */
  async generateResponse(
    message: string, 
    history: any[], 
    userId: string, 
    materialId?: string, 
    images?: any[]
  ) {
    // 1. Create or Get Session
    let sessionId = history.length > 0 ? history[0].session_id : null;
    
    if (!sessionId) {
      // Create new session if none exists
      const { data: session } = await this.supabase
        .from('chat_sessions')
        .insert({
           user_id: userId,
           material_id: materialId || null,
           title: message.slice(0, 30) // Use first 30 chars as title
        })
        .select()
        .single();
        
      if (session) sessionId = session.id;
    }

    // 2. Save User Message
    if (sessionId) {
      await this.supabase.from('chat_messages').insert({
        session_id: sessionId,
        user_id: userId,
        role: 'user',
        content: message
      });
    }

    // 3. Mock AI Response (Replace this with real OpenAI/Anthropic call later)
    // For now, this makes the build pass and the UI work.
    const aiResponseText = "I am the UniBot AI. I have received your message: " + message;

    // 4. Save AI Message
    if (sessionId) {
      await this.supabase.from('chat_messages').insert({
        session_id: sessionId,
        user_id: userId,
        role: 'assistant',
        content: aiResponseText
      });
    }

    return { 
      sessionId, 
      content: aiResponseText 
    };
  }
}
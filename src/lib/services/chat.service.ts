import { createClient } from '@/lib/supabase/server';
import { ChatMessage, ChatSession } from '@/types';

export class ChatService {
  
  static async createSession(userId: string, title: string = 'New Chat') {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, title })
      .select()
      .single();

    if (error) throw error;
    return data as ChatSession;
  }

  static async getSessions(userId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ChatSession[];
  }

  static async saveMessage(message: {
    session_id: string;
    user_id: string;
    role: 'user' | 'assistant';
    content: string;
  }) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('chat_messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return data as ChatMessage;
  }

  static async getHistory(sessionId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as ChatMessage[];
  }
}
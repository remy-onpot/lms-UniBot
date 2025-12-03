import { supabase } from '../supabase'; // Relative path
import { ChatSession, ChatMessage } from '../../types'; // Relative path

export const ChatService = {
  
  // Create a new conversation thread (optionally linked to a material)
  async createSession(userId: string, title: string = 'New Chat', materialId?: string) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert([{ user_id: userId, title, material_id: materialId }])
      .select()
      .single();

    if (error) throw error;
    return data as ChatSession;
  },

  // Get the most recent session for a specific material
  async getSessionByMaterial(userId: string, materialId: string) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('material_id', materialId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as ChatSession | null;
  },

  // Fetch all conversation threads for the sidebar
  async getUserSessions(userId: string) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as ChatSession[];
  },

  // Fetch messages for a specific thread
  async getSessionMessages(sessionId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as ChatMessage[];
  },

  // Save a message (User or AI)
  async saveMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{ session_id: sessionId, role, content }])
      .select()
      .single();

    if (error) throw error;

    // Update the session's "updated_at" timestamp
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    return data as ChatMessage;
  },

  async updateSessionTitle(sessionId: string, title: string) {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ title })
      .eq('id', sessionId);
      
    if (error) throw error;
  }
};
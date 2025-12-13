import { supabase } from '../supabase'; 
import { ChatSession, ChatMessage } from '../../types'; 

export const ChatService = {
  
  // --- READ METHODS ---

  async getUserSessions(userId: string) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as ChatSession[];
  },

  async getSessionMessages(sessionId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as ChatMessage[];
  },

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

  // --- WRITE METHODS (Optimized) ---

  async createSession(userId: string, title: string = 'New Chat', materialId?: string) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert([{ user_id: userId, title, material_id: materialId }])
      .select()
      .single();

    if (error) throw error;
    return data as ChatSession;
  },

  /**
   * ✅ OPTIMIZED: Now only performs 1 DB call.
   * The Postgres Trigger handles the session 'updated_at' timestamp automatically.
   */
  async saveMessage(sessionId: string, role: 'user' | 'assistant', content: string, images?: string[]) {
    // 1. Insert Message (Trigger auto-updates the session)
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{ 
        session_id: sessionId, 
        role, 
        content,
        images: images || [] // Support for Gemini Vision inputs
      }])
      .select()
      .single();

    if (error) throw error;
    return data as ChatMessage;
  },

  async updateSessionTitle(sessionId: string, title: string) {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ title })
      .eq('id', sessionId);
      
    if (error) throw error;
  },

  async deleteSession(sessionId: string) {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);
      
    if (error) throw error;
  }
};
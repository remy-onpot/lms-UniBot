import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

export class AccessService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Checks if a user can use a specific feature based on their Tier
   */
  async canAccessFeature(userId: string, feature: 'ai_pro' | 'virtual_lab' | 'downloads' | 'ai_basic') {
    // Call the database function we just created
    const { data, error } = await this.supabase
      .rpc('check_feature_access', { 
        user_uuid: userId, 
        feature_name: feature === 'ai_pro' ? 'ai_chat_pro' : 
                      feature === 'virtual_lab' ? 'virtual_lab' : 
                      feature === 'downloads' ? 'downloads' : 'ai_chat_basic'
      });

    if (error) {
      console.error('Access check failed:', error);
      return false; // Fail safe (deny access on error)
    }

    return data;
  }

  /**
   * Logs usage for AI limits (Call this after they send a message)
   */
  async logAiUsage(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    // Upsert: Try to update today's row, or insert if it doesn't exist
    const { error } = await this.supabase
      .from('daily_usage_logs')
      .upsert({ 
        user_id: userId, 
        date: today,
        // We can't do atomic increment easily in simple upsert without a function, 
        // but for now, we just ensure the row exists.
        // A better approach is an RPC for atomic increment.
      }, { onConflict: 'user_id, date' });
      
    // Call an atomic increment function (Recommended)
    await this.supabase.rpc('increment_ai_usage', { user_uuid: userId });
  }
}
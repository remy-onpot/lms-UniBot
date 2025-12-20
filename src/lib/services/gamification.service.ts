import { createClient } from '@/lib/supabase/server';

export class GamificationService {
  
  /**
   * Award XP to a user and log history
   */
  static async awardXP(userId: string, amount: number, actionType: string) {
    const supabase = await createClient();

    // 1. Log History
    await supabase.from('xp_history').insert({
      user_id: userId,
      amount: amount,
      action_type: actionType
    });

    // 2. Increment User Total (Atomic update)
    // We use an RPC call if available, or a read-write transaction logic.
    // For simplicity with RLS, we rely on the backend triggering this or direct update.
    
    // Fetch current
    const { data: user } = await supabase
      .from('users')
      .select('xp')
      .eq('id', userId)
      .single();

    if (user) {
      const newXP = (user.xp || 0) + amount;
      await supabase
        .from('users')
        .update({ xp: newXP, last_activity_date: new Date().toISOString() })
        .eq('id', userId);
    }
  }

  /**
   * Get user leaderboard (Global or per University)
   */
  static async getLeaderboard(limit = 10) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, avatar_url, xp, profile_frame')
      .order('xp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Check and update streak
   * Should be called on login or first daily activity
   */
  static async updateStreak(userId: string) {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: user } = await supabase
      .from('users')
      .select('current_streak, last_activity_date')
      .eq('id', userId)
      .single();

    if (!user) return;

    const lastActivity = user.last_activity_date ? new Date(user.last_activity_date).toISOString().split('T')[0] : null;

    if (lastActivity === today) {
      return; // Already active today
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = user.current_streak;

    if (lastActivity === yesterdayStr) {
      newStreak += 1; // Continued streak
    } else {
      newStreak = 1; // Broken streak, reset to 1 (today)
    }

    await supabase
      .from('users')
      .update({ 
        current_streak: newStreak, 
        last_activity_date: new Date().toISOString() 
      })
      .eq('id', userId);
      
    return newStreak;
  }
}
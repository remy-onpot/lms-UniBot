import { supabase } from '../supabase';
import { ShopItem } from '../../types';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';

// Define different activities and their base XP rewards
const XP_RATES = {
  daily_quiz: { base: 10, per_question: 10, limit: 3 }, // Dynamic Score
  course_quiz: { base: 50, per_question: 0, limit: Infinity }, // Completion Reward
  assignment: { base: 100, per_question: 0, limit: Infinity }, // Big Reward
  reading: { base: 5, per_question: 0, limit: 10 } // Small, frequent reward
};

export type ActivityType = keyof typeof XP_RATES;

export const GamificationService = {
  
  // --- 1. SECURE ACTION (Database RPC) ---
  
  async recordActivity(userId: string, type: ActivityType, score: number = 0, total: number = 0) {
    // Call the secure Database RPC
    const { data, error } = await supabase.rpc('record_activity', {
      p_activity_type: type,
      p_score: score,
      p_total: total
    });

    if (error) {
      // Propagate the specific error (e.g., "Daily limit reached")
      throw new Error(error.message);
    }

    return data as { xpEarned: number; newStreak: number; gemsAdded: number };
  },

  // --- 2. HELPERS (Read-Only) ---

  async checkDailyLogin(userId: string) {
    // The RPC now handles streak resets automatically on the next action,
    // but for UI display purposes, we can keep a lightweight check here.
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!user) return null;
    
    // We don't update DB here anymore, just calculate for UI display
    // The real update happens when they DO something via recordActivity
    return { 
      newStreak: user.current_streak, 
      xpGained: 0 
    };
  },

  async checkDailyLimit(userId: string, type: ActivityType = 'daily_quiz'): Promise<boolean> {
    // Optional: Check UI side to disable buttons before clicking
    // The RPC enforces this securely, but this improves UX
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('activity_type', type)
      .gte('created_at', `${today}T00:00:00.000Z`);

    const config = XP_RATES[type];
    const limit = config?.limit ?? Infinity;
    return (count || 0) < limit;
  },

  // --- 3. SHOP / INVENTORY METHODS ---
  async getShopItems() {
    const { data, error } = await supabase.from('shop_items').select('*').eq('is_active', true).order('cost');
    if (error) throw error;
    return data as ShopItem[];
  },

  async buyItem(userId: string, itemId: string) {
    const response = await fetch('/api/shop/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Purchase failed');
    return { success: true, newGems: data.new_balance, newOwned: data.new_frames };
  },

  async equipFrame(userId: string, frameId: string) {
    const { error } = await supabase.from('users').update({ profile_frame: frameId }).eq('id', userId);
    if (error) throw error;
  },

  // --- 4. INTEREST / PROFILE METHODS ---
  async getAvailableInterests() {
    const { data, error } = await supabase.from('interest_topics').select('name, emoji').eq('is_active', true).order('name');
    if (error) throw error;
    return data;
  },

  // --- 5. ANALYTICS / STATS METHODS ---
  async getWeeklyStats(userId: string) {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 6);
    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select('created_at, metadata')
      .eq('user_id', userId)
      .gte('created_at', startOfDay(sevenDaysAgo).toISOString())
      .lte('created_at', endOfDay(today).toISOString());

    if (error) throw error;

    const statsMap = new Map<string, { xp: number; minutes: number }>();
    for (let i = 6; i >= 0; i--) {
      const dayLabel = format(subDays(today, i), 'EEE');
      statsMap.set(dayLabel, { xp: 0, minutes: 0 });
    }

    logs?.forEach(log => {
      const dayLabel = format(new Date(log.created_at), 'EEE');
      const current = statsMap.get(dayLabel) || { xp: 0, minutes: 0 };
      const xp = log.metadata?.xp || 0;
      const duration = log.metadata?.duration || 0;
      statsMap.set(dayLabel, { xp: current.xp + xp, minutes: current.minutes + duration });
    });

    return Array.from(statsMap.entries()).map(([day, data]) => ({
      day,
      xp: data.xp,
      hours: parseFloat((data.minutes / 60).toFixed(1))
    }));
  }
};
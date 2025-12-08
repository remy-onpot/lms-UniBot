import { supabase } from '../supabase';
import { ShopItem } from '../../types';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';

// Constants
const XP_RATES = {
  daily_quiz: { base: 10, per_question: 10, limit: 3 },
  course_quiz: { base: 50, per_question: 0, limit: Infinity },
  assignment: { base: 100, per_question: 0, limit: Infinity },
  reading: { base: 5, per_question: 0, limit: 10 }
};

export type ActivityType = keyof typeof XP_RATES;

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon_name: string;
  category: string;
  xp_reward: number;
  earned_at?: string;
}

export const GamificationService = {
  
  // --- 1. CORE ACTION (Secure RPC) ---
  async recordActivity(userId: string, type: ActivityType, score: number = 0, total: number = 0) {
    const { data, error } = await supabase.rpc('record_activity', {
      p_activity_type: type,
      p_score: score,
      p_total: total
    });

    if (error) throw new Error(error.message);

    // Trigger Achievement Check after recording
    await this.checkAndAwardAchievements(userId, { type: type === 'daily_quiz' ? 'quiz_finish' : 'assignment_submit', score, total });

    return data as { xpEarned: number; newStreak: number; gemsAdded: number };
  },

  // --- 2. ACHIEVEMENT ENGINE (Server-Side Logic) ---
  async checkAndAwardAchievements(userId: string, context: { 
    type: 'quiz_finish' | 'assignment_submit' | 'shop_buy' | 'streak_update';
    score?: number; 
    total?: number;
  }) {
    const newUnlocks: string[] = [];

    // Fetch Stats
    const { data: profile } = await supabase.from('users').select('current_streak, xp').eq('id', userId).single();
    const { count: quizCount } = await supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('activity_type', 'daily_quiz');
    const { count: assignCount } = await supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('activity_type', 'assignment');

    // Fetch Badges
    const { data: allAchievements } = await supabase.from('achievements').select('*');
    const { data: userBadges } = await supabase.from('user_achievements').select('achievement_id').eq('user_id', userId);
    
    const ownedIds = new Set(userBadges?.map(b => b.achievement_id));
    const now = new Date();
    const currentHour = now.getHours();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    for (const ach of allAchievements || []) {
      if (ownedIds.has(ach.id)) continue; 

      let earned = false;
      const c = ach.criteria;

      // Rules Engine
      if (c.min_streak && (profile?.current_streak || 0) >= c.min_streak) earned = true;
      if (c.quiz_count && (quizCount || 0) >= c.quiz_count) earned = true;
      if (context.type === 'quiz_finish' && c.perfect_score && context.score === context.total) earned = true;
      if (c.assign_count && (assignCount || 0) >= c.assign_count) earned = true;
      if (c.hour_end && currentHour < c.hour_end) earned = true;
      if (c.hour_start && currentHour >= c.hour_start) earned = true;
      if (c.is_weekend && isWeekend) earned = true;
      if (context.type === 'shop_buy' && c.shop_purchase) earned = true;

      // Award Badge
      if (earned) {
        await supabase.from('user_achievements').insert({ user_id: userId, achievement_id: ach.id });
        
        // ✅ FIX: Correctly handle RPC promise error without using .catch() on the builder
        const { error: rpcError } = await supabase.rpc('increment_xp', { user_id: userId, amount: ach.xp_reward });
        
        // Fallback if RPC fails (e.g., function missing)
        if (rpcError) {
             await supabase.from('users').update({ xp: (profile?.xp || 0) + ach.xp_reward }).eq('id', userId);
        }
        
        newUnlocks.push(ach.name);
      }
    }
    return newUnlocks;
  },

  async getAllAchievements(userId: string): Promise<Achievement[]> {
    const { data: all } = await supabase.from('achievements').select('*').order('xp_reward', { ascending: true });
    const { data: owned } = await supabase.from('user_achievements').select('achievement_id, earned_at').eq('user_id', userId);
    const ownedMap = new Map(owned?.map(o => [o.achievement_id, o.earned_at]));

    return (all || []).map(ach => ({ ...ach, earned_at: ownedMap.get(ach.id) }));
  },

  // --- 3. ANALYTICS (Merged & Improved) ---
  
  async getUserStats(userId: string) {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 6); // Last 7 days

    // 1. Fetch Logs with Metadata
    const { data: logs } = await supabase
      .from('activity_logs')
      .select('created_at, activity_type, metadata')
      .eq('user_id', userId)
      .gte('created_at', startOfDay(sevenDaysAgo).toISOString());

    if (!logs) return { weeklyActivity: [], totalHours: 0, totalDays: 0 };

    // 2. Calculate Totals (Lifetime)
    const { count: totalLogs } = await supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    
    // Estimate Total Hours (Average 10 mins per activity across lifetime)
    const totalHours = Math.round(((totalLogs || 0) * 15) / 60); 

    // Calculate Unique Active Days
    const totalDays = new Set(logs.map(l => new Date(l.created_at).toDateString())).size; 

    // 3. Process Weekly Data for Chart
    const statsMap = new Map<string, { xp: number; hours: number }>();
    
    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const dayLabel = format(subDays(today, i), 'EEE'); // "Mon", "Tue"
      statsMap.set(dayLabel, { xp: 0, hours: 0 });
    }

    logs.forEach(log => {
      const dayLabel = format(new Date(log.created_at), 'EEE');
      const current = statsMap.get(dayLabel) || { xp: 0, hours: 0 };

      // Prefer real metadata, fallback to estimation
      const xp = log.metadata?.xp_earned || 10; 
      let duration = log.metadata?.duration || 0; // minutes

      if (duration === 0) {
          // Fallback Estimations
          if (log.activity_type === 'daily_quiz') duration = 5;
          else if (log.activity_type === 'course_quiz') duration = 15;
          else if (log.activity_type === 'assignment') duration = 60;
          else duration = 10;
      }

      statsMap.set(dayLabel, { 
          xp: current.xp + xp, 
          hours: current.hours + (duration / 60) 
      });
    });

    const weeklyActivity = Array.from(statsMap.entries()).map(([day, data]) => ({
      day,
      xp: data.xp,
      hours: parseFloat(data.hours.toFixed(1))
    }));

    return { weeklyActivity, totalHours, totalDays };
  },

  // --- 4. HELPERS ---
  async checkDailyLogin(userId: string) {
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!user) return null;
    return { newStreak: user.current_streak, xpGained: 0 };
  },

  async checkDailyLimit(userId: string, type: ActivityType = 'daily_quiz'): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('activity_type', type)
      .gte('created_at', `${today}T00:00:00.000Z`);

    const limit = XP_RATES[type]?.limit ?? Infinity;
    return (count || 0) < limit;
  },

  // --- 5. SHOP ---
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
    
    await this.checkAndAwardAchievements(userId, { type: 'shop_buy' });
    
    return { success: true, newGems: data.new_balance, newOwned: data.new_frames };
  },

  async equipFrame(userId: string, frameId: string) {
    const { error } = await supabase.from('users').update({ profile_frame: frameId }).eq('id', userId);
    if (error) throw error;
  },

  async getAvailableInterests() {
    const { data } = await supabase.from('interest_topics').select('name, emoji').eq('is_active', true).order('name');
    return data || [];
  }
};
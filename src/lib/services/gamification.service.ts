import { supabase } from '../supabase';

export const GamificationService = {
  
  // 1. Dashboard Check: Validate streak (Reset if missed yesterday)
  async checkDailyLogin(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: user } = await supabase
      .from('users')
      .select('current_streak, last_activity_date, xp, streak_freezes')
      .eq('id', userId)
      .single();

    if (!user) return null;

    // Logic: If last activity was BEFORE yesterday, streak is broken.
    // Unless we implement auto-freeze consumption here.
    const lastDate = user.last_activity_date ? new Date(user.last_activity_date) : new Date(0);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Strip time for accurate comparison
    const lastDateStr = lastDate.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If they missed a day (last activity was older than yesterday)
    // And it wasn't today (just in case)
    if (lastDateStr < yesterdayStr && lastDateStr !== today) {
       // Streak Broken! Reset to 0.
       await supabase.from('users').update({ current_streak: 0 }).eq('id', userId);
       return { newStreak: 0, xpGained: 0 };
    }

    return { newStreak: user.current_streak, xpGained: 0 };
  },

  // 2. Action Trigger: Actually increment streak (Quiz/Reading)
  async recordActivity(userId: string, type: 'quiz' | 'reading') {
    const today = new Date().toISOString().split('T')[0];
    
    await supabase.from('activity_logs').insert({
      user_id: userId,
      activity_type: type
    });

    const { data: user } = await supabase
      .from('users')
      .select('current_streak, last_activity_date, streak_freezes, xp, gems')
      .eq('id', userId)
      .single();
      
    if (!user) return;

    if (user.last_activity_date === today) {
      await this.awardXP(userId, 5, 'extra_work');
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    let newFreezes = user.streak_freezes;
    let streakKeptWithFreeze = false;

    if (user.last_activity_date === yesterdayStr) {
      newStreak = (user.current_streak || 0) + 1;
    } else if (user.streak_freezes > 0 && user.current_streak > 0) {
      newFreezes = user.streak_freezes - 1;
      newStreak = (user.current_streak || 0) + 1; 
      streakKeptWithFreeze = true;
    } else {
      newStreak = 1;
    }

    let gemsToAdd = 0;
    if (newStreak % 7 === 0) gemsToAdd = 5;
    if (newStreak % 10 === 0 && newFreezes < 3) newFreezes++;

    await supabase.from('users').update({
      last_activity_date: today,
      current_streak: newStreak,
      streak_freezes: newFreezes,
      gems: (user.gems || 0) + gemsToAdd
    }).eq('id', userId);

    await this.awardXP(userId, 50, 'daily_streak_action');

    return { 
      newStreak, 
      usedFreeze: streakKeptWithFreeze, 
      earnedFreeze: newStreak % 10 === 0 && user.streak_freezes < 3,
      earnedGems: gemsToAdd
    };
  },

  async awardXP(userId: string, amount: number, reason: string) {
    const { data } = await supabase.from('users').select('xp').eq('id', userId).single();
    const currentXP = data?.xp || 0;

    await supabase.from('users').update({ xp: currentXP + amount }).eq('id', userId);
    
    await supabase.from('xp_history').insert({
      user_id: userId,
      amount,
      action_type: reason
    });
  },

  async getLeaderboard() {
    const { data } = await supabase
      .from('weekly_leaderboard')
      .select('weekly_xp, user_id')
      .order('weekly_xp', { ascending: false })
      .limit(10);
      
    return data;
  }
};
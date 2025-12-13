import { supabase } from '@/lib/supabase'; // ✅ Using your existing singleton
import { subDays, format, startOfDay } from 'date-fns';
import { ShopItem, ActivityType } from '@/types';

// --- TYPES ---
export interface QuizResult {
  score: number;
  totalQuestions: number;
  startedAt: Date;
  completedAt: Date;
  topics?: string[];
  round?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  xp_reward: number;
  icon: string;
  criteria: any;
  created_at?: string;
}

export interface AchievementWithStatus extends Achievement {
  earned_at?: string;
}

// ✅ Fix for "Parameter 'log' implicitly has an 'any' type"
interface ActivityLog {
  created_at: string;
  activity_type: ActivityType;
  xp_earned: number;
}

export interface DailyQuizResponse {
  questions: any[];
  round: number;
  topic: string;
  error?: string;
}

export const GamificationService = {
  
  // --- 1. CORE ACTIVITY LOGGING ---

  async recordActivity(userId: string, type: ActivityType, metadata: any = {}) {
    const score = typeof metadata === 'number' ? metadata : (metadata.score || 0);
    const metaObj = typeof metadata === 'object' ? metadata : { score };

    const { error } = await supabase.from('activity_logs').insert({
      user_id: userId,
      activity_type: type,
      score: score,
      metadata: metaObj 
    });

    if (error) {
      console.error('Gamification Log Error:', error);
      return { success: false }; 
    }
    return { success: true };
  },

  // --- 2. DAILY QUIZ MANAGEMENT ---

  async getDailyQuestions(): Promise<DailyQuizResponse> {
    try {
      const response = await fetch('/api/daily-quiz/start', {
        method: 'POST',
      });

      if (response.status === 429) {
        return { questions: [], round: 0, topic: '', error: 'LIMIT_REACHED' };
      }

      if (!response.ok) throw new Error('Failed to start quiz');
      
      const data = await response.json();
      return {
        questions: data.questions,
        round: data.round,       
        topic: data.topic       
      };

    } catch (error) {
      console.error('Quiz Start Error:', error);
      return {
        questions: [],
        round: 1,
        topic: "Offline Mode",
        error: 'NETWORK_ERROR'
      };
    }
  },

  async submitQuizResult(userId: string, result: QuizResult) {
    const durationSeconds = Math.round(
      (result.completedAt.getTime() - result.startedAt.getTime()) / 1000
    );

    const { error: historyError } = await supabase
      .from('quiz_history')
      .insert({
        user_id: userId,
        quiz_type: 'daily_quiz',
        score: result.score,
        total_questions: result.totalQuestions,
        started_at: result.startedAt.toISOString(),
        completed_at: result.completedAt.toISOString(),
        duration_seconds: durationSeconds,
        topics_covered: result.topics || [],
        metadata: { round: result.round } 
      });

    if (historyError) {
      console.error('Failed to save history:', historyError);
      throw historyError;
    }

    const roundBonus = (result.round || 1) * 20; 
    
    return this.recordActivity(userId, 'daily_quiz', {
      score: result.score,
      total: result.totalQuestions,
      duration: durationSeconds,
      bonus_xp: roundBonus
    });
  },
/**
   * 📚 RECORD READING SESSION
   * Call this when the student closes a PDF or leaves a topic page.
   * Only records if they spent > 5 minutes (300 seconds).
   */
  async recordReadingSession(userId: string, topicId: string, durationSeconds: number) {
    if (durationSeconds < 300) {
      console.log("Reading too short for streak (Min 5m)");
      return; 
    }

  
    return this.recordActivity(userId, 'reading', {
      duration: durationSeconds,
      topic_id: topicId,
      bonus_xp: 0
    });
  },

  // --- 3. STATS & ACHIEVEMENTS ---

  async getAllAchievements(userId: string): Promise<AchievementWithStatus[]> {
    const { data: all } = await supabase.from('achievements').select('*').order('xp_reward', { ascending: true });
    const { data: owned } = await supabase.from('user_achievements').select('achievement_id, earned_at').eq('user_id', userId);

    const ownedMap = new Map(owned?.map((o: any) => [o.achievement_id, o.earned_at]));

    return (all || []).map((ach: any) => ({ 
        ...ach,
        earned_at: ownedMap.get(ach.id) 
    }));
  },

  async getUserStats(userId: string) {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 6);

    const { data: recentLogs } = await supabase
      .from('activity_logs')
      .select('created_at, activity_type, xp_earned')
      .eq('user_id', userId)
      .gte('created_at', startOfDay(sevenDaysAgo).toISOString());

    const { count: totalLogs } = await supabase.from('activity_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    
    // Process Graph Data
    const logs = (recentLogs as ActivityLog[]) || []; // ✅ Fixed Type
    const statsMap = new Map<string, { xp: number; hours: number }>();
    
    for (let i = 6; i >= 0; i--) {
      statsMap.set(format(subDays(today, i), 'EEE'), { xp: 0, hours: 0 });
    }

    // ✅ Fixed 'log' implicit any error
    logs.forEach((log: ActivityLog) => {
      const dayLabel = format(new Date(log.created_at), 'EEE');
      const current = statsMap.get(dayLabel) || { xp: 0, hours: 0 };
      
      let durationMinutes = 10;
      if (log.activity_type === 'daily_quiz') durationMinutes = 5;
      else if (log.activity_type === 'assignment') durationMinutes = 45;
      else if (log.activity_type === 'course_quiz') durationMinutes = 15;

      statsMap.set(dayLabel, { 
          xp: current.xp + (log.xp_earned || 0), 
          hours: current.hours + (durationMinutes / 60) 
      });
    });

    const weeklyActivity = Array.from(statsMap.entries()).map(([day, data]) => ({
      day,
      xp: data.xp,
      hours: parseFloat(data.hours.toFixed(1))
    }));

    // ✅ Fixed 'l' implicit any error
    const activeDays = new Set(logs.map((l: ActivityLog) => new Date(l.created_at).toDateString())).size;
    const totalHours = Math.round(((totalLogs || 0) * 15) / 60);

    return { weeklyActivity, totalHours, totalDays: activeDays };
  },

  // --- 4. SHOP FUNCTIONALITY ---

  async getShopItems() {
    const { data, error } = await supabase.from('shop_items').select('*').eq('is_active', true).order('cost', { ascending: true });
    if (error) throw error;
    return data as ShopItem[];
  },

  async buyItem(userId: string, itemId: string) {
    const { data, error } = await supabase.rpc('purchase_item', { 
      p_user_id: userId, 
      p_item_id: itemId 
    });

    if (error) throw new Error(error.message);
    return { success: true, newBalance: data?.new_balance };
  },

  async equipFrame(userId: string, itemId: string) {
    const { error } = await supabase.rpc('equip_item', { 
      p_user_id: userId, 
      p_item_id: itemId 
    });
    if (error) throw error;
  },

  async getAvailableInterests() {
     const { data, error } = await supabase.from('interest_topics').select('name, emoji').eq('is_active', true).order('name');
     if (error) return [];
     return data;
  }
};
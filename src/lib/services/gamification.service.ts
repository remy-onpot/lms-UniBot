import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// ==========================================
// 1. TYPE DEFINITIONS (Exported for UI)
// ==========================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;        // 'Trophy' | 'Flame' etc.
  points: number;      // XP Value
  badge_url: string;   // Image URL or empty string
  earned_at?: string;  // ISO Date string if unlocked, undefined if locked
  
  // Legacy alias support (optional, depending on your UI usage)
  name?: string;       
  xp_reward?: number;  
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'frame' | 'boost' | 'freeze' | 'theme'; // Strict union type
  asset_value: string;
  is_active: boolean;
}

// ==========================================
// 2. SERVICE CLASS
// ==========================================

export class GamificationService {
  constructor(private supabase: SupabaseClient<Database>) {}

  // ---------------------------------------------------------------------------
  // SECTION A: DAILY LOGIN & STREAKS
  // ---------------------------------------------------------------------------

  /**
   * Processes the daily login logic via Database RPC.
   * Handles streak incrementing and daily point awards.
   */
  async checkDailyLogin(userId: string) {
    const { data, error } = await this.supabase
      .rpc('process_daily_login', { user_uuid: userId });

    if (error) {
      console.error('Login Process Error:', error);
      return null;
    }
    
    // Cast generic JSON response to expected shape
    return data as { 
      streak: number; 
      points_added: number; 
      status: string; 
    } | null;
  }

  // ---------------------------------------------------------------------------
  // SECTION B: ACHIEVEMENTS
  // ---------------------------------------------------------------------------

  /**
   * Fetches all achievements and marks them as unlocked/locked for the user.
   */
  async getAllAchievements(userId: string): Promise<Achievement[]> {
    try {
      // Fetch definitions joined with user progress
      const { data, error } = await this.supabase
        .from('achievements')
        .select(`
          *,
          user_achievements!left ( earned_at )
        `)
        .order('points', { ascending: true });

      if (error || !data) {
        console.warn("Failed to fetch achievements:", error?.message);
        return [];
      }

      // Map to strict Interface
      return data.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description || '', // Handle DB nulls
        icon: item.icon || 'Trophy',
        points: item.points || 10,
        badge_url: item.badge_url || '',
        earned_at: item.user_achievements?.[0]?.earned_at || undefined,
        
        // Aliases for compatibility
        name: item.title,
        xp_reward: item.points
      }));
    } catch (e) { 
      console.error(e);
      return []; 
    }
  }

  /**
   * Triggers a check on the server to see if user met conditions for new badges.
   * Useful to call after completing an assignment or quiz.
   */
  async checkAndAwardAchievements(userId: string, event: { type: string; [key: string]: any }) {
    // We cast RPC name to 'any' to prevent build blocking if types aren't fully regenerated
    const { data, error } = await this.supabase
      .rpc('check_achievements' as any, { 
        user_uuid: userId, 
        event_type: event.type 
      });

    if (error) {
      // Just warn, don't crash. This logic is optional enhancement.
      console.warn('Achievement check failed:', error.message);
      return [];
    }
    
    // Returns array of newly unlocked achievement names (strings)
    return (data as string[]) || []; 
  }

  // ---------------------------------------------------------------------------
  // SECTION C: USER STATS & PROFILE
  // ---------------------------------------------------------------------------

  async getAvailableInterests() {
    return [
      'Artificial Intelligence', 'Web Development', 'Data Science', 
      'Digital Marketing', 'Entrepreneurship', 'Graphic Design',
      'Finance', 'Public Speaking', 'Psychology', 'Blockchain',
      'Robotics', 'Creative Writing', 'Cybersecurity'
    ];
  }

  async getUserStats(userId: string) {
    const { data, error } = await this.supabase
      .rpc('get_student_stats', { student_uuid: userId });

    if (error || !data) {
      return { totalHours: 0, assignmentsCompleted: 0, quizzesCompleted: 0 };
    }

    // Safely cast the JSON return
    const stats = data as { 
        total_hours?: number; 
        assignments_completed?: number; 
        quizzes_completed?: number; 
    };

    return {
      totalHours: stats.total_hours || 0,
      assignmentsCompleted: stats.assignments_completed || 0,
      quizzesCompleted: stats.quizzes_completed || 0
    };
  }

  // ---------------------------------------------------------------------------
  // SECTION D: SHOP & INVENTORY
  // ---------------------------------------------------------------------------

  async getShopItems(): Promise<ShopItem[]> {
    const { data, error } = await this.supabase
      .from('shop_items')
      .select('*')
      .eq('is_active', true)
      .order('cost', { ascending: true });

    if (error || !data) return [];
    
    // Map to strict ShopItem interface
    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      cost: item.cost,
      type: (item.type as ShopItem['type']) || 'frame', // Safe cast with fallback
      asset_value: item.asset_value || '',
      is_active: item.is_active || false
    }));
  }

  async getOwnedItems(userId: string) {
    const { data } = await this.supabase
      .from('user_inventory')
      .select('item_id')
      .eq('user_id', userId);
      
    return data?.map((i: any) => i.item_id) || [];
  }

  async buyItem(userId: string, itemId: string) {
    const { data, error } = await this.supabase
      .rpc('purchase_shop_item', { 
        p_user_id: userId, 
        p_item_id: itemId 
      });

    if (error) throw new Error(error.message);
    
    // RPC returns new integer balance
    return { success: true, newGems: data }; 
  }

  async equipFrame(userId: string, itemId: string) {
    const { error } = await this.supabase
      .from('users')
      .update({ profile_frame: itemId })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  }
}
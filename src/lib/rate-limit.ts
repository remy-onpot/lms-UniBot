import { supabase } from './supabase';

// Different limits for different actions
const LIMITS: { [key: string]: number } = {
  chat: 50,          // 50 chat messages per hour
  quiz_generation: 10 // 10 quiz generations per hour
};

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function checkRateLimit(userId: string, action: 'chat' | 'quiz_generation' = 'chat'): Promise<boolean> {
  try {
    const limit = LIMITS[action] || 50;
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MS).toISOString();

    // 1. Count requests in the last hour for this specific action
    const { count, error } = await supabase
      .from('request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('endpoint', action) // We use 'endpoint' column to store the action type
      .gte('created_at', windowStart);

    if (error) {
      console.error("Rate limit check failed (DB error):", error);
      // Fail OPEN: If DB is down, let the user through rather than blocking valid traffic
      return true; 
    }

    const currentCount = count || 0;

    if (currentCount >= limit) {
      console.warn(`Rate limit exceeded for user ${userId} on action ${action}. Count: ${currentCount}/${limit}`);
      return false; // Limit exceeded
    }

    // 2. Log this request (Fire and forget - don't await to speed up response)
    // We catch errors here so they don't crash the main request
    supabase.from('request_logs').insert({
      user_id: userId,
      endpoint: action
    }).then(({ error }) => {
      if (error) console.error("Failed to log request:", error);
    });

    return true; // Allowed

  } catch (err) {
    console.error("Rate limit check failed (Unknown error):", err);
    return true; // Fail open
  }
}
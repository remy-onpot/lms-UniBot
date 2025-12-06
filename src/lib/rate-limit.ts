import { supabase } from './supabase'; // Relative path

// Define limits for different actions
const LIMITS: { [key: string]: number } = {
  chat: 50,          // 50 messages/hour
  quiz_generation: 10, // 10 quizzes/hour
  grading: 20        // 20 assignments/hour
};

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function checkRateLimit(userId: string, action: 'chat' | 'quiz_generation' | 'grading'): Promise<boolean> {
  try {
    const limit = LIMITS[action] || 50;
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MS).toISOString();

    // 1. Count requests in the last hour
    // Note: This requires a 'request_logs' table in Supabase
    const { count, error } = await supabase
      .from('request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('endpoint', action)
      .gte('created_at', windowStart);

    if (error) {
      console.error("Rate limit check failed (DB error):", error);
      // Fail OPEN: If DB is down, let users through to avoid blocking legitimate traffic during outages
      return true; 
    }

    const currentCount = count || 0;

    if (currentCount >= limit) {
      console.warn(`Rate limit exceeded for user ${userId} on action ${action}.`);
      return false; 
    }

    // 2. Log this request (Fire and forget)
    supabase.from('request_logs').insert({
      user_id: userId,
      endpoint: action
    }).then(({ error }) => {
      if (error) console.error("Failed to log request:", error);
    });

    return true;

  } catch (err) {
    console.error("Rate limit check failed (Unknown):", err);
    return true; 
  }
}
import { createClient } from './supabase/server'; // ✅ Import the SERVER client creator

// Define limits
const LIMITS: { [key: string]: number } = {
  chat: 50,
  quiz_generation: 10,
  grading: 20
};

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function checkRateLimit(userId: string, action: 'chat' | 'quiz_generation' | 'grading'): Promise<boolean> {
  try {
    // ✅ Create a fresh server client for this request
    const supabase = await createClient();
    
    const limit = LIMITS[action] || 50;
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MS).toISOString();

    const { count, error } = await supabase
      .from('request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('endpoint', action)
      .gte('created_at', windowStart);

    if (error) {
      // Fail OPEN (allow request) if DB is down/missing to prevent blocking users
      console.error("Rate limit check failed (DB error):", error.message);
      return true; 
    }

    const currentCount = count || 0;

    if (currentCount >= limit) {
      console.warn(`Rate limit exceeded for user ${userId} on action ${action}.`);
      return false; 
    }

    // Log request (Fire and forget - don't await)
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
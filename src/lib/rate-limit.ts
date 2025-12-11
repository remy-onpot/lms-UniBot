import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "./env";

// Create a new Ratelimit instance using an ephemeral cache
const ratelimit = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  // Sliding window: safer than fixed window (avoids spikes at the hour mark)
  limiter: Ratelimit.slidingWindow(10, "10 s"), 
  analytics: true, 
  prefix: "@lms-unibot",
});

// Define specific limits per action (requests per window)
const CONFIG = {
  chat: { limit: 50, window: "1 h" },      // 50 msgs / hour
  quiz_generation: { limit: 10, window: "1 h" }, // 10 quizzes / hour
  grading: { limit: 20, window: "1 h" },   // 20 assignments / hour
};

export async function checkRateLimit(
  identifier: string, 
  action: 'chat' | 'quiz_generation' | 'grading'
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  
  const rule = CONFIG[action];
  
  // Dynamically switch the limiter based on the action
  const dynamicLimiter = new Ratelimit({
    redis: new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(rule.limit, rule.window as any),
    prefix: `@lms/${action}`,
  });

  // "identifier" is usually user.id
  const { success, limit, remaining, reset } = await dynamicLimiter.limit(identifier);

  return { success, limit, remaining, reset };
}
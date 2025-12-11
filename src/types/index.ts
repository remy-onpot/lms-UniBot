import { z } from "zod";

// =============================================================================
// 1. GLOBAL ENUMS & CONSTANTS
// =============================================================================

export const RoleSchema = z.enum(['student', 'lecturer', 'university_admin', 'super_admin']);
export type Role = z.infer<typeof RoleSchema>;

export const PlanTierSchema = z.enum(['starter', 'pro', 'elite', 'cohort_manager']);
export type PlanTier = z.infer<typeof PlanTierSchema>;

export const AccessTypeSchema = z.enum(['single_course', 'semester_bundle']);
export type AccessType = z.infer<typeof AccessTypeSchema>;

// =============================================================================
// 2. USER & PROFILE (Gamification + Business Logic)
// =============================================================================

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().min(2),
  role: RoleSchema,
  avatar_url: z.string().url().optional().nullable(),
  
  // 💼 Business Logic
  plan_tier: PlanTierSchema.default('starter'),
  subscription_status: z.enum(['active', 'inactive', 'past_due']).default('inactive'),
  subscription_end_date: z.string().datetime().optional().nullable(),
  is_course_rep: z.boolean().default(false),
  university_id: z.string().optional(),
  onboarding_completed: z.boolean().default(false),

  // 🎮 Gamification (Restored)
  xp: z.number().default(0),
  gems: z.number().default(0),
  current_streak: z.number().default(0),
  longest_streak: z.number().default(0),
  streak_freezes: z.number().default(0),
  last_activity_date: z.string().datetime().optional(),
  last_login_date: z.string().datetime().optional(),
  
  // 👤 Social & Customization (Restored)
  bio: z.string().optional(),
  interests: z.array(z.string()).optional(),
  phone_number: z.string().optional(),
  profile_frame: z.string().default('default'),
  owned_frames: z.array(z.string()).default(['default']),
  achievements: z.array(z.custom<Achievement>()).optional(), // Recursive type handled below
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// =============================================================================
// 3. CLASS & COURSE STRUCTURE
// =============================================================================

export const ClassSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3),
  lecturer_id: z.string().uuid().nullable(), 
  access_code: z.string().length(6),
  created_at: z.string().datetime(),
  
  // ⚡ Optimization: Cached type to avoid joins
  type: z.enum(['saas', 'cohort']).default('cohort'),
  
  users: z.object({
    plan_tier: PlanTierSchema
  }).optional(),

  _count: z.object({
    students: z.number().optional(),
    courses: z.number().optional()
  }).optional()
});

export type Class = z.infer<typeof ClassSchema>;

export const CourseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  class_id: z.string().uuid(),
  status: z.enum(['active', 'archived']).default('active'),
  classes: ClassSchema.optional()
});

export type Course = z.infer<typeof CourseSchema>;

// =============================================================================
// 4. LEARNING CONTENT (Topics, Materials, Quizzes) - RESTORED
// =============================================================================

export interface Topic {
  id: string;
  week_number: number;
  title: string;
  description: string;
  start_page: number;
  end_page: number;
  quizzes: { id: string }[];
}

export interface Material {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  is_main_handout: boolean;
  content_text?: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

export interface Quiz {
  id: string;
  course_id: string;
  topic_id: string;
  title: string;
  topic: string;
  questions?: Question[];
  courses?: {
    classes?: {
      users?: {
        plan_tier: string;
      };
    };
  };
}

export interface QuizResult {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  submitted_at: string;
  users?: {
    full_name: string;
    email: string;
  };
}

// =============================================================================
// 5. ASSIGNMENTS & GRADING (Strictly Typed)
// =============================================================================

export const AIGradeSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string(),
  breakdown: z.object({
    reasoning: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  }),
  is_ai_generated: z.boolean().default(true),
});

export type AIGradedResponse = z.infer<typeof AIGradeSchema>;

export interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  total_points: number;
  course_id: string;
  mySubmission?: AssignmentSubmission;
}

export const AssignmentSubmissionSchema = z.object({
  id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  student_id: z.string().uuid(),
  content_text: z.string().optional(),
  file_url: z.string().url().optional(),
  
  // Grading
  ai_grade: z.number().optional(), // Legacy support
  ai_feedback: z.string().optional(), // Legacy support
  ai_is_detected: z.boolean().default(false),
  ai_breakdown: AIGradeSchema.optional().nullable(), // New strict schema
  
  lecturer_grade: z.number().optional().nullable(),
  lecturer_feedback: z.string().optional().nullable(),
  attempt_count: z.number().default(1),
  
  submitted_at: z.string().datetime(),
  users: z.object({
    full_name: z.string(),
    email: z.string()
  }).optional()
});

export type AssignmentSubmission = z.infer<typeof AssignmentSubmissionSchema>;

// =============================================================================
// 6. CHAT & AI
// =============================================================================

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  material_id?: string | null;
}

// We map 'Message' to your chat UI needs
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  created_at: z.string().optional(),
  isStreaming: z.boolean().optional(),
  session_id: z.string().optional()
});

export type Message = z.infer<typeof MessageSchema>;
export type ChatMessage = Message; // Alias for backward compatibility

export interface AIGeneratedQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

// =============================================================================
// 7. GAMIFICATION & SHOP (Restored)
// =============================================================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at?: string;
}

export interface StreakUpdate {
  newStreak: number;
  xpGained: number;
  usedFreeze?: boolean;
  earnedFreeze?: boolean;
  earnedGems?: number;
}

export interface FrameItem {
  id: string;
  name: string;
  cost: number;
  cssClass: string; 
}

export interface ShopItem {
  id: string;
  name: string;
  description?: string;
  cost: number;
  category: 'frame' | 'badge' | 'theme';
  asset_value: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

// =============================================================================
// 8. BILLING & ACCESS (New Logic)
// =============================================================================

export const StudentAccessSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  access_type: AccessTypeSchema,
  course_id: z.string().uuid().optional().nullable(),
  class_id: z.string().uuid().optional().nullable(),
  expires_at: z.string().datetime(),
  amount_paid: z.number().min(0),
  currency: z.string().default('GHS'),
});

export type StudentAccess = z.infer<typeof StudentAccessSchema>;

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  reference: z.string(),
  amount: z.number(),
  status: z.enum(['success', 'failed', 'pending']),
  purpose: z.string(),
  user_id: z.string().uuid(),
  created_at: z.string().datetime(),
});

export type Transaction = z.infer<typeof TransactionSchema>;
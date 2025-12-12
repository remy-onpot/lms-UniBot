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

export const MaterialCategorySchema = z.enum(['handout', 'supplementary', 'recording']);
export type MaterialCategory = z.infer<typeof MaterialCategorySchema>;

// =============================================================================
// 2. USER & PROFILE
// =============================================================================

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().min(2),
  role: RoleSchema,
  avatar_url: z.string().url().optional().nullable(),
  
  // Business Logic
  plan_tier: PlanTierSchema.default('starter'),
  subscription_status: z.enum(['active', 'inactive', 'past_due']).default('inactive'),
  subscription_end_date: z.string().datetime().optional().nullable(),
  is_course_rep: z.boolean().default(false),
  university_id: z.string().uuid().optional().nullable(), // Corrected type to UUID/null
  onboarding_completed: z.boolean().default(false),

  // Gamification (Cached DB values)
  xp: z.number().default(0),
  gems: z.number().default(0),
  current_streak: z.number().default(0),
  // Removed redundant longest_streak, streak_freezes
  last_activity_date: z.string().datetime().optional(),
  last_login_date: z.string().datetime().optional(),
  
  // Profile
  bio: z.string().optional().nullable(),
  interests: z.array(z.string()).optional(),
  phone_number: z.string().optional().nullable(),
  profile_frame: z.string().default('default'),
  owned_frames: z.array(z.string()).default(['default']),
  achievements: z.array(z.custom<Achievement>()).optional(), 
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
  type: z.enum(['saas', 'cohort']).default('cohort'),
  created_at: z.string().datetime(),
  
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
// 4. LEARNING CONTENT (Topics, Materials, Quizzes) - Unified
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

/**
 * FINAL MATERIAL INTERFACE: Reflects the single merged DB table.
 */
export interface Material {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  category: MaterialCategory; // New unified column
  is_main_handout: boolean;
  content_text?: string | null; // Must be nullable
  course_id: string;
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
// 5. ASSIGNMENTS & GRADING
// =============================================================================

export const AIGradeSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string(),
  breakdown: z.object({
    reasoning: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  }).nullable(), // MUST be nullable to work with optional fields
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
  content_text: z.string().optional().nullable(),
  file_url: z.string().url().optional().nullable(),
  
  // Unified Grading Fields
  score: z.number().optional().nullable(), // Use score/feedback as the source of truth
  feedback: z.string().optional().nullable(),
  graded_by: z.enum(['ai', 'lecturer']).optional().nullable(),
  
  // AI-Specific breakdown data
  ai_breakdown: AIGradeSchema.optional().nullable(),
  
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

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  created_at: z.string().optional(),
  isStreaming: z.boolean().optional(),
  session_id: z.string().optional()
});

export type Message = z.infer<typeof MessageSchema>;
export type ChatMessage = Message; // Alias

export interface AIGeneratedQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

// =============================================================================
// 7. GAMIFICATION & SHOP (Fixing Export Errors)
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

/** * FINAL SHOP ITEM EXPORT: Fixes the 'no exported member ShopItem' error.
 */
export interface ShopItem {
  id: string;
  name: string;
  description?: string;
  cost: number;
  category: 'frame' | 'badge' | 'theme';
  asset_value: string;
}

/** * FINAL ANNOUNCEMENT EXPORT: Fixes the 'no exported member Announcement' error.
 */
export interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

// =============================================================================
// 8. BILLING & ACCESS (Golden Schema: Use class_enrollments)
// =============================================================================

/**
 * REPLACEMENT FOR StudentAccess: The core table is now `class_enrollments`.
 */
export const ClassEnrollmentSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
  joined_at: z.string().datetime(),
  
  // Payment Status (migrated fields)
  has_paid: z.boolean().default(false),
  access_type: AccessTypeSchema,
  expires_at: z.string().datetime().optional().nullable(),
});

export type ClassEnrollment = z.infer<typeof ClassEnrollmentSchema>;

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
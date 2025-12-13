import { z } from "zod";

// =============================================================================
// 1. GLOBAL ENUMS
// =============================================================================

export const RoleSchema = z.enum(['student', 'lecturer', 'university_admin', 'super_admin']);
export type Role = z.infer<typeof RoleSchema>;

export const PlanTierSchema = z.enum(['starter', 'pro', 'elite', 'cohort_manager']);
export type PlanTier = z.infer<typeof PlanTierSchema>;

export const AccessTypeSchema = z.enum(['single_course', 'semester_bundle']);
export type AccessType = z.infer<typeof AccessTypeSchema>;

export const MaterialCategorySchema = z.enum(['handout', 'supplementary', 'recording']);
export type MaterialCategory = z.infer<typeof MaterialCategorySchema>;
export type ActivityType = 'daily_quiz' | 'course_quiz' | 'assignment' | 'reading' | 'login' | 'achievement';
// =============================================================================
// 2. GAMIFICATION (Moved Up for Dependency)
// =============================================================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at?: string;
}

// =============================================================================
// 3. USER & PROFILE
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
  university_id: z.string().uuid().optional().nullable(),
  onboarding_completed: z.boolean().default(false),

  // Gamification
  xp: z.number().default(0),
  gems: z.number().default(0),
  current_streak: z.number().default(0),
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
// 4. CLASS & COURSE
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
// 5. LEARNING CONTENT
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
  category: MaterialCategory;
  is_main_handout: boolean;
  content_text?: string | null;
  course_id: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  type?: 'multiple_choice' | 'true_false'; // Added to fix type error
}

/** * Safe version of Question for frontend/students 
 */
export type PublicQuestion = Omit<Question, 'correct_answer'>;

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
// 6. ASSIGNMENTS
// =============================================================================

export const AIGradeSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string(),
  breakdown: z.object({
    reasoning: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  }).nullable(),
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
  score: z.number().optional().nullable(),
  feedback: z.string().optional().nullable(),
  graded_by: z.enum(['ai', 'lecturer']).optional().nullable(),
  ai_breakdown: AIGradeSchema.optional().nullable(),
  submitted_at: z.string().datetime(),
  users: z.object({
    full_name: z.string(),
    email: z.string()
  }).optional()
});

export type AssignmentSubmission = z.infer<typeof AssignmentSubmissionSchema>;

// =============================================================================
// 7. CHAT & MESSAGES
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
  session_id: z.string().optional(),
  images: z.array(z.string()).optional() // Added for images support
});

export type Message = z.infer<typeof MessageSchema>;
export type ChatMessage = Message; 

export interface AIGeneratedQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

// =============================================================================
// 8. SHOP & BILLING
// =============================================================================

export interface StreakUpdate {
  newStreak: number;
  xpGained: number;
  usedFreeze?: boolean;
  earnedFreeze?: boolean;
  earnedGems?: number;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'frame' | 'accessory' | 'theme' | 'badge';
  asset_value: string;
  is_active: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export const ClassEnrollmentSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
  joined_at: z.string().datetime(),
  has_paid: z.boolean().default(false),
  access_type: AccessTypeSchema,
  expires_at: z.string().datetime().optional().nullable(),
});
export interface StudentCourseSummary {
  id: string;
  title: string;
  className: string;
  progress: number;
  quizCount: number;
  assignmentCount: number;
}
export type ClassEnrollment = z.infer<typeof ClassEnrollmentSchema>;
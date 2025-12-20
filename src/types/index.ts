import { z } from "zod";
import { Database } from './database.types';

// =============================================================================
// 1. GLOBAL ENUMS & CONSTANTS
// =============================================================================

export const RoleSchema = z.enum(['student', 'lecturer', 'university_admin', 'super_admin']);
export type Role = z.infer<typeof RoleSchema>;

export const PlanTierSchema = z.enum(['free', 'starter', 'pro', 'university_enterprise']);
export type PlanTier = z.infer<typeof PlanTierSchema>;

export const AccessTypeSchema = z.enum(['single_course', 'semester_bundle']);
export type AccessType = z.infer<typeof AccessTypeSchema>;

export const MaterialCategorySchema = z.enum(['supplementary', 'lecture_note', 'textbook']);
export type MaterialCategory = z.infer<typeof MaterialCategorySchema>;

// =============================================================================
// 2. USER & PROFILE
// =============================================================================

export type DbUser = Database['public']['Tables']['users']['Row'];

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().min(2),
  role: RoleSchema,
  avatar_url: z.string().url().optional().nullable(),
  plan_tier: PlanTierSchema.default('free'),
  subscription_status: z.string().optional().nullable(),
  subscription_end_date: z.string().datetime().optional().nullable(),
  is_course_rep: z.boolean().default(false),
  university_id: z.string().uuid().optional().nullable(),
  department: z.string().optional().nullable(),
  student_id_code: z.string().optional().nullable(),
  custom_university: z.string().optional().nullable(),
  onboarding_completed: z.boolean().default(false),
  xp: z.number().default(0),
  gems: z.number().default(0),
  current_streak: z.number().default(0),
  last_activity_date: z.string().datetime().optional().nullable(),
  bio: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  profile_frame: z.string().default('default'),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// =============================================================================
// 3. CLASS & COURSE STRUCTURE
// =============================================================================

export type DbClass = Database['public']['Tables']['classes']['Row'];
export type DbCourse = Database['public']['Tables']['courses']['Row'];

export const ClassSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3),
  lecturer_id: z.string().uuid().nullable(),
  access_code: z.string().length(6),
  type: z.enum(['saas', 'cohort']).default('cohort'),
  created_at: z.string().datetime(),
  access_price: z.number().default(0),
  owner_id: z.string().uuid().optional(), // Added for creation flow

  _count: z.object({
    enrollments: z.number().optional(),
    courses: z.number().optional()
  }).optional()
});

export type Class = z.infer<typeof ClassSchema> & {
  courses?: Course[];
};

export const CourseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional().nullable(),
  class_id: z.string().uuid(),
  course_code: z.string().optional().nullable(),
  lecturer_id: z.string().uuid().nullable(),
  status: z.string().default('active'),
});

export type Course = z.infer<typeof CourseSchema> & {
  lecturer?: {
    full_name: string;
    avatar_url: string | null;
  };
  progress?: number; 
  materials_count?: number;
  assignments_count?: number;
};

// =============================================================================
// 4. LEARNING CONTENT
// =============================================================================

export type DbMaterial = Database['public']['Tables']['materials']['Row'];

export interface Topic {
  id: string;
  week_number: number;
  title: string;
  course_id: string;
  created_at: string;
}

export interface Material extends DbMaterial {}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  options: any;
  correct_answer: string;
}

export interface Quiz {
  id: string;
  course_id: string | null;
  title: string;
  created_at: string;
  questions?: Question[];
}

export interface QuizResult {
  id: string;
  quiz_id: string | null;
  student_id: string;
  score: number;
  created_at: string;
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
  }).nullable(),
  is_ai_generated: z.boolean().default(true),
});

export type AIGradedResponse = z.infer<typeof AIGradeSchema>;

export interface Assignment {
  id: string;
  title: string;
  total_points: number | null;
  due_date: string | null;
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
  status: z.enum(['pending_grading', 'graded', 'failed']).default('pending_grading'),
  submitted_at: z.string().datetime(),
});

export type AssignmentSubmission = z.infer<typeof AssignmentSubmissionSchema>;

// =============================================================================
// 6. CHAT & AI
// =============================================================================

export interface ChatSession {
  id: string;
  user_id: string | null;
  title: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string | null;
  role: string;
  content: string;
  created_at: string;
}

export type Message = ChatMessage;

// =============================================================================
// 7. BILLING & ACCESS
// =============================================================================

export const ClassEnrollmentSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid().nullable(),
  class_id: z.string().uuid().nullable(),
  status: z.enum(['pending', 'approved', 'rejected', 'removed']),
  joined_at: z.string().datetime(),
});

export type ClassEnrollment = z.infer<typeof ClassEnrollmentSchema>;

export const StudentAccessSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  access_type: AccessTypeSchema,
  class_id: z.string().uuid().optional().nullable(),
  course_id: z.string().uuid().optional().nullable(),
  amount_paid: z.number().optional().nullable(),
  payment_reference: z.string().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
});

export type StudentAccess = z.infer<typeof StudentAccessSchema>;

export interface Transaction {
  id: string;
  reference: string;
  amount: number;
  status: string;
  user_id: string;
  created_at: string;
}

// =============================================================================
// 8. SHOP
// =============================================================================

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  type: string;
  is_active: boolean | null;
}

// =============================================================================
// 9. EXTRAS
// =============================================================================

export interface Announcement {
  id: string;
  class_id: string | null;
  lecturer_id: string | null;
  title: string;
  message: string;
  created_at: string;
}
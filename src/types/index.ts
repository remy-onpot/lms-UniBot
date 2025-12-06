export type Role = 'student' | 'lecturer' | 'university_admin' | 'super_admin';
export type PlanTier = 'starter' | 'pro' | 'elite' | 'cohort_manager';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_course_rep: boolean;
  plan_tier: PlanTier;
  university_id?: string;
  onboarding_completed?: boolean;
  
  // ✅ Gamification Fields
  xp: number;
  gems: number;
  current_streak: number;
  longest_streak: number;
  streak_freezes: number;
  last_activity_date?: string;
  last_login_date?: string;
}

export interface Class {
  id: string;
  name: string;
  lecturer_id: string;
  access_code: string;
  users?: {
    plan_tier: PlanTier;
  };
}

export interface Course {
  id: string;
  title: string;
  description: string;
  class_id: string;
  classes?: Class;
}

export interface Topic {
  id: string;
  week_number: number;
  title: string;
  description: string;
  start_page: number;
  end_page: number;
  quizzes: { id: string }[];
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

export interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  total_points: number;
  course_id: string;
  mySubmission?: AssignmentSubmission;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  content_text: string;
  file_url: string;
  ai_grade: number;
  ai_feedback: string;
  ai_is_detected: boolean;
  ai_breakdown?: any;
  lecturer_grade?: number;
  lecturer_feedback?: string;
  attempt_count: number;
  submitted_at: string;
  users?: {
    full_name: string;
    email: string;
  };
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export interface Material {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  is_main_handout: boolean;
  content_text?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  material_id?: string | null;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface AIGeneratedQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface AIGradedResponse {
  score: number;
  is_ai_generated: boolean;
  feedback: string;
  breakdown: {
    reasoning: string;
    strengths: string[];
    weaknesses: string[];
  };
}

export interface StreakUpdate {
  newStreak: number;
  xpGained: number;
  usedFreeze?: boolean;
  earnedFreeze?: boolean;
  earnedGems?: number;
}
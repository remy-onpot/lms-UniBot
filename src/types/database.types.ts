export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          role: 'student' | 'lecturer' | 'university_admin' | 'super_admin'
          student_id_code: string | null
          university_id: string | null
          department: string | null
          plan_tier: 'free' | 'starter' | 'pro' | 'university_enterprise'
          subscription_status: string | null
          subscription_end_date: string | null
          xp: number
          gems: number
          current_streak: number
          bio: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'student' | 'lecturer' | 'university_admin' | 'super_admin'
          avatar_url?: string | null
          student_id_code?: string | null
          university_id?: string | null
          department?: string | null
          plan_tier?: 'free' | 'starter' | 'pro' | 'university_enterprise'
          subscription_status?: string | null
          subscription_end_date?: string | null
          xp?: number
          gems?: number
          current_streak?: number
          bio?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      classes: {
        Row: {
          id: string
          name: string
          owner_id: string
          lecturer_id: string | null
          access_code: string
          type: 'saas' | 'cohort'
          status: string
          access_price: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          lecturer_id?: string | null
          access_code: string
          type: 'saas' | 'cohort'
          status?: string
          access_price?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['classes']['Insert']>
      }
      courses: {
        Row: {
          id: string
          class_id: string
          lecturer_id: string | null
          title: string
          description: string | null
          course_code: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          lecturer_id?: string | null
          title: string
          description?: string | null
          course_code?: string | null
          status?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['courses']['Insert']>
      }
      class_enrollments: {
        Row: {
          id: string
          class_id: string
          student_id: string
          status: 'pending' | 'approved' | 'rejected' | 'removed'
          joined_at: string
        }
        Insert: {
          id?: string
          class_id: string
          student_id: string
          status?: 'pending' | 'approved' | 'rejected' | 'removed'
          joined_at?: string
        }
        Update: Partial<Database['public']['Tables']['class_enrollments']['Insert']>
      }
      student_course_access: {
        Row: {
          id: string
          student_id: string
          access_type: 'single_course' | 'semester_bundle'
          class_id: string | null
          course_id: string | null
          amount_paid: number | null
          payment_reference: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          access_type: 'single_course' | 'semester_bundle'
          class_id?: string | null
          course_id?: string | null
          amount_paid?: number | null
          payment_reference?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['student_course_access']['Insert']>
      }
      materials: {
        Row: {
          id: string
          course_id: string
          title: string
          file_url: string
          file_type: string | null
          category: 'supplementary' | 'lecture_note' | 'textbook'
          is_main_handout: boolean
          content_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          file_url: string
          file_type?: string | null
          category?: 'supplementary' | 'lecture_note' | 'textbook'
          is_main_handout?: boolean
          content_text?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['materials']['Insert']>
      }
      // Add other tables (assignments, quizzes, etc) as needed
    }
  }
}
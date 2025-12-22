export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          id: string
          name: string
          xp_reward: number | null
        }
        Insert: {
          id?: string
          name: string
          xp_reward?: number | null
        }
        Update: {
          id?: string
          name?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          activity_type: string
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string | null
          feature_used: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          feature_used?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          feature_used?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          ai_breakdown: Json | null
          assignment_id: string
          content_text: string | null
          feedback: string | null
          file_url: string | null
          graded_by: string | null
          id: string
          score: number | null
          status: string | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          ai_breakdown?: Json | null
          assignment_id: string
          content_text?: string | null
          feedback?: string | null
          file_url?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          ai_breakdown?: Json | null
          assignment_id?: string
          content_text?: string | null
          feedback?: string | null
          file_url?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          status: string | null
          title: string
          total_points: number | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          title: string
          total_points?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          title?: string
          total_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      class_announcements: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          message: string
          title: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          message: string
          title: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          message?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_announcements_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          class_id: string | null
          id: string
          joined_at: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          class_id?: string | null
          id?: string
          joined_at?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          class_id?: string | null
          id?: string
          joined_at?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          access_code: string
          access_price: number | null
          created_at: string | null
          id: string
          lecturer_id: string | null
          name: string
          owner_id: string
          status: string | null
          type: string
        }
        Insert: {
          access_code: string
          access_price?: number | null
          created_at?: string | null
          id?: string
          lecturer_id?: string | null
          name: string
          owner_id: string
          status?: string | null
          type: string
        }
        Update: {
          access_code?: string
          access_price?: number | null
          created_at?: string | null
          id?: string
          lecturer_id?: string | null
          name?: string
          owner_id?: string
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_topics: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          title: string
          week_number: number
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          title: string
          week_number: number
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          title?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_topics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          class_id: string
          course_code: string | null
          created_at: string | null
          description: string | null
          id: string
          lecturer_id: string | null
          status: string | null
          title: string
        }
        Insert: {
          class_id: string
          course_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lecturer_id?: string | null
          status?: string | null
          title: string
        }
        Update: {
          class_id?: string
          course_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lecturer_id?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sections: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          material_id: string
          page_number: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          material_id: string
          page_number?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          material_id?: string
          page_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_sections_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      interest_topics: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          category: Database["public"]["Enums"]["material_category"] | null
          content_text: string | null
          course_id: string
          created_at: string | null
          file_type: string | null
          file_url: string
          id: string
          is_main_handout: boolean | null
          title: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["material_category"] | null
          content_text?: string | null
          course_id: string
          created_at?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          is_main_handout?: boolean | null
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["material_category"] | null
          content_text?: string | null
          course_id?: string
          created_at?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_main_handout?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          id: string
          options: Json
          question_text: string
          quiz_id: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          id?: string
          options: Json
          question_text: string
          quiz_id?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          id?: string
          options?: Json
          question_text?: string
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          created_at: string | null
          id: string
          quiz_id: string | null
          score: number
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          quiz_id?: string | null
          score: number
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          quiz_id?: string | null
          score?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          cost: number
          id: string
          is_active: boolean | null
          name: string
          type: string
        }
        Insert: {
          cost?: number
          id?: string
          is_active?: boolean | null
          name: string
          type: string
        }
        Update: {
          cost?: number
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      student_course_access: {
        Row: {
          access_type: Database["public"]["Enums"]["access_type_enum"]
          amount_paid: number | null
          class_id: string | null
          course_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          payment_reference: string | null
          student_id: string
        }
        Insert: {
          access_type: Database["public"]["Enums"]["access_type_enum"]
          amount_paid?: number | null
          class_id?: string | null
          course_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_reference?: string | null
          student_id: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["access_type_enum"]
          amount_paid?: number | null
          class_id?: string | null
          course_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_reference?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_course_access_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_course_access_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_course_access_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reference: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reference: string
          status: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reference?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          subdomain: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          subdomain: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          subdomain?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_inventory: {
        Row: {
          id: string
          is_equipped: boolean | null
          item_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          is_equipped?: boolean | null
          item_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          is_equipped?: boolean | null
          item_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          current_streak: number | null
          custom_university: string | null
          department: string | null
          email: string
          full_name: string
          gems: number | null
          id: string
          is_course_rep: boolean | null
          last_activity_date: string | null
          onboarding_completed: boolean | null
          phone_number: string | null
          plan_tier: Database["public"]["Enums"]["plan_tier_enum"] | null
          profile_frame: string | null
          role: string
          student_id_code: string | null
          subscription_end_date: string | null
          subscription_status: string | null
          university_id: string | null
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          current_streak?: number | null
          custom_university?: string | null
          department?: string | null
          email: string
          full_name: string
          gems?: number | null
          id: string
          is_course_rep?: boolean | null
          last_activity_date?: string | null
          onboarding_completed?: boolean | null
          phone_number?: string | null
          plan_tier?: Database["public"]["Enums"]["plan_tier_enum"] | null
          profile_frame?: string | null
          role?: string
          student_id_code?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          university_id?: string | null
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          current_streak?: number | null
          custom_university?: string | null
          department?: string | null
          email?: string
          full_name?: string
          gems?: number | null
          id?: string
          is_course_rep?: boolean | null
          last_activity_date?: string | null
          onboarding_completed?: boolean | null
          phone_number?: string | null
          plan_tier?: Database["public"]["Enums"]["plan_tier_enum"] | null
          profile_frame?: string | null
          role?: string
          student_id_code?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          university_id?: string | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_history: {
        Row: {
          action_type: string
          amount: number
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          amount: number
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          amount?: number
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_student_dashboard_stats: {
        Args: { student_uuid: string }
        Returns: Json
      }
      get_user_relevant_classes: {
        Args: never
        Returns: {
          access_code: string
          access_price: number | null
          created_at: string | null
          id: string
          lecturer_id: string | null
          name: string
          owner_id: string
          status: string | null
          type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "classes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      access_type_enum: "single_course" | "semester_bundle"
      material_category: "supplementary" | "lecture_note" | "textbook"
      plan_tier_enum: "free" | "starter" | "pro" | "university_enterprise"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_type_enum: ["single_course", "semester_bundle"],
      material_category: ["supplementary", "lecture_note", "textbook"],
      plan_tier_enum: ["free", "starter", "pro", "university_enterprise"],
    },
  },
} as const

import { supabase } from '@/lib/supabase';
import { getPlanLimits, SAAS_PLANS, PlanTier } from '@/lib/constants';

// --- Interfaces ---
export interface DashboardClass {
  id: string;
  name: string;
  lecturer_id: string;
  access_code: string;
  created_at: string;
  status: 'active' | 'archived';
  type: 'saas' | 'cohort';
  description?: string;
  course_count?: number;
  studentCount?: number;
  isOwner?: boolean;
}

export interface EnrolledStudent {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  enrolled_at: string;
}

export const ClassService = {
  
  /**
   * Get Single Class Details
   */
  async getById(classId: string) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get Modules (Courses) for a Class
   */
  async getModules(classId: string) {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        assignments:assignments(count),
        quizzes:quizzes(count)
      `)
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((c: any) => ({
      ...c,
      assignmentCount: c.assignments?.[0]?.count || 0,
      quizCount: c.quizzes?.[0]?.count || 0
    }));
  },

  /**
   * Get Enrolled Students
   */
  async getStudents(classId: string): Promise<EnrolledStudent[]> {
    const { data, error } = await supabase
      .from('class_enrollments')
      .select(`
        created_at,
        users:student_id (
          id, full_name, email, avatar_url
        )
      `)
      .eq('class_id', classId);

    if (error) {
      console.error("Error fetching students:", error);
      return [];
    }

    return data.map((d: any) => ({
      id: d.users.id,
      full_name: d.users.full_name,
      email: d.users.email,
      avatar_url: d.users.avatar_url,
      enrolled_at: d.created_at
    }));
  },

  /**
   * 🛡️ SECURE: Fetch Dashboard Classes
   * Retrieves all classes relevant to the user, identifying type and ownership.
   */
  async getDashboardClasses(userId: string, role: string, isRep: boolean): Promise<DashboardClass[]> {
    if (role === 'student' && !isRep) return [];

    // Fetch classes where user is the lecturer
    // Note: In a real app, you might also fetch classes where they are a "TA" via a join table
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        courses (count),
        class_enrollments (count)
      `)
      .eq('lecturer_id', userId)
      .in('status', ['active', 'archived']) 
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Class fetch error:', error);
        throw error;
    }

    return data.map((cls: any) => ({
      ...cls,
      // 🧠 LOGIC: Ensure type is set. Fallback to 'cohort' for legacy safety.
      type: cls.type || 'cohort', 
      isOwner: cls.lecturer_id === userId,
      course_count: cls.courses?.[0]?.count || 0,
      studentCount: cls.class_enrollments?.[0]?.count || 0
    }));
  },

  /**
   * 🛡️ SECURE: Create Class
   * Enforces limits based on 'SaaS' classes only.
   * Forces 'type' assignment to prevent permission leaks.
   */
  async createClass(userId: string, classData: any, userProfile: any) {
    // 1. Determine Target Class Type
    const classType = userProfile.role === 'lecturer' ? 'saas' : 'cohort';

    // 2. Fetch Active Classes of this specific type to check limits
    const allClasses = await this.getDashboardClasses(userId, userProfile.role, userProfile.is_course_rep);
    const activeOwnedClasses = allClasses.filter(c => c.type === classType && c.status === 'active');
    
    const limits = getPlanLimits(userProfile.role, userProfile.plan_tier, userProfile.is_course_rep);

    if (activeOwnedClasses.length >= limits.max_classes) {
        throw new Error(`Plan limit reached (${limits.max_classes} active classes). Please archive old classes or upgrade.`);
    }

    // 3. Create the class
    const { data, error } = await supabase
      .from('classes')
      .insert([{
        ...classData,
        lecturer_id: userId,
        status: 'active',
        type: classType // ✅ Explicitly enforced
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * 🛡️ SECURE: Archive Class
   * Prevents archiving of University Cohorts.
   */
  async archiveClass(classId: string, userId: string) {
    // Verify ownership and type first
    const { data: cls } = await supabase
      .from('classes')
      .select('type, lecturer_id')
      .eq('id', classId)
      .single();
    
    if (!cls) throw new Error("Class not found");
    
    // ⛔ SECURITY BLOCK
    if (cls.type === 'cohort') {
        throw new Error("🚫 Action Denied: Cohorts cannot be archived by individual lecturers. Contact Admin.");
    }
    
    if (cls.lecturer_id !== userId) {
        throw new Error("🚫 Unauthorized: You do not own this class.");
    }

    const { error } = await supabase
      .from('classes')
      .update({ status: 'archived' })
      .eq('id', classId);
      
    if (error) throw error;
  },

  /**
   * 🛡️ SECURE: Restore Class
   * Checks limits before restoring.
   */
  async restoreClass(classId: string, userId: string, userProfile: any) {
    // 1. Verify Class Properties
    const { data: cls } = await supabase.from('classes').select('type').eq('id', classId).single();
    if (!cls) throw new Error("Class not found");

    // 2. Check Limits for that specific type
    const allClasses = await this.getDashboardClasses(userId, userProfile.role, userProfile.is_course_rep);
    const activeClasses = allClasses.filter(c => c.type === cls.type && c.status === 'active');
    const limits = getPlanLimits(userProfile.role, userProfile.plan_tier, userProfile.is_course_rep);

    if (activeClasses.length >= limits.max_classes) {
        throw new Error("Cannot restore: Active class limit reached. Archive another class first.");
    }

    const { error } = await supabase
      .from('classes')
      .update({ status: 'active' })
      .eq('id', classId);
      
    if (error) throw error;
  },

  /**
   * 🛡️ SECURE: Delete Class
   * Hard delete, strictly for SaaS classes only.
   */
  async deleteClass(classId: string, userId: string) {
    const { data: cls } = await supabase.from('classes').select('type, lecturer_id').eq('id', classId).single();
    
    if (!cls) throw new Error("Class not found");
    
    if (cls.type === 'cohort') {
        throw new Error("🚫 Action Denied: Cohorts cannot be permanently deleted.");
    }
    
    if (cls.lecturer_id !== userId) {
        throw new Error("🚫 Unauthorized.");
    }

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);
      
    if (error) throw error;
  }
};
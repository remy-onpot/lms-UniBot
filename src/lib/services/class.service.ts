import { supabase } from '@/lib/supabase';
import { getPlanLimits } from '@/lib/constants';
import { Achievement } from '@/types';

// --- Types ---
export interface ClassItem {
  id: string;
  name: string;
  owner_id: string;
  access_code: string;
  type: 'saas' | 'cohort';
  status: 'active' | 'archived';
  description?: string;
  created_at?: string;
  lecturer_id?: string;
  requires_approval?: boolean;
  
  // Computed properties
  course_count?: number;
  student_count?: number;
  is_owner?: boolean;
  is_enrolled?: boolean;
}

// --- ALIASES (Fixes your "Module has no exported member" errors) ---
export type ClassData = ClassItem;      // For Profile Page
export type DashboardClass = ClassItem; // For Lecturer Dashboard

export interface ModuleItem {
  id: string;
  title: string;
  description: string;
  class_id: string;
  status?: 'active' | 'archived'; 
  assignment_count?: number;
  quiz_count?: number;
}

export const ClassService = {

  /**
   * 🔍 GET BY ID
   */
  async getById(classId: string): Promise<ClassItem | null> {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) {
      // Ignore 'PGRST116' (No rows/Class not found) to prevent console spam
      if (error.code !== 'PGRST116') {
        console.error('Error fetching class:', error);
      }
      return null;
    }
    return data;
  },

  /**
   * 🛡️ FETCH DASHBOARD CLASSES
   */
  async getDashboardClasses(userId: string, role: string, isRep: boolean): Promise<ClassItem[]> {
    try {
      let targetClassIds: string[] = [];

      // 1. ALWAYS Fetch Enrollments (For Students AND Lecturers)
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', userId)
        .eq('status', 'approved');
      
      const enrolledIds = enrollments?.map(e => e.class_id) || [];
      targetClassIds = [...targetClassIds, ...enrolledIds];

      // 2. IF Lecturer/Rep/Admin -> ALSO fetch Owned Classes
      if (role === 'lecturer' || isRep || role === 'super_admin') {
        const { data: owned } = await supabase
          .from('classes')
          .select('id')
          .eq('owner_id', userId)
          .neq('status', 'deleted');

        const ownedIds = owned?.map(c => c.id) || [];
        targetClassIds = [...targetClassIds, ...ownedIds];
      }

      // 3. Deduplicate
      const uniqueIds = Array.from(new Set(targetClassIds));
      if (uniqueIds.length === 0) return [];

      // 4. Fetch Full Data
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          courses:courses(count),
          enrollments:class_enrollments(count)
        `)
        .in('id', uniqueIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((cls: any) => ({
        ...cls,
        is_owner: cls.owner_id === userId,
        course_count: cls.courses?.[0]?.count || 0,
        student_count: cls.enrollments?.[0]?.count || 0
      }));

    } catch (e) {
      console.error('getDashboardClasses error:', e);
      return [];
    }
  },

  /**
   * 🛡️ CREATE CLASS
   */
  async createClass(userId: string, classData: any, userProfile: any) {
    const classType = userProfile.role === 'lecturer' ? 'saas' : 'cohort';

    const { count } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('status', 'active');

    const limits = getPlanLimits(userProfile.role, userProfile.plan_tier, userProfile.is_course_rep);
    
    if ((count || 0) >= limits.max_classes) {
      throw new Error(`Upgrade Plan: Limit reached (${limits.max_classes} active classes).`);
    }

    const { data, error } = await supabase
      .from('classes')
      .insert([{
        ...classData,
        owner_id: userId,
        lecturer_id: userId,
        status: 'active',
        type: classType,
        requires_approval: classData.requires_approval || false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * 📚 GET MODULES
   */
  async getModules(classId: string): Promise<ModuleItem[]> {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        assignments:assignments(count),
        quizzes:quizzes(count)
      `)
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data.map((c: any) => ({
      ...c,
      assignment_count: c.assignments?.[0]?.count || 0,
      quiz_count: c.quizzes?.[0]?.count || 0
    }));
  },

  /**
   * 👥 GET STUDENTS
   */
  async getStudents(classId: string, status: 'approved' | 'pending' | 'all' = 'approved') {
    let query = supabase
      .from('class_enrollments')
      .select(`
        created_at, 
        status, 
        student:users (
          id, full_name, email, avatar_url
        )
      `)
      .eq('class_id', classId);

    if (status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
        console.error("Get Students Error", error);
        return [];
    }

    return data.map((d: any) => {
        const studentObj = Array.isArray(d.student) ? d.student[0] : d.student;
        return {
            id: studentObj?.id,
            full_name: studentObj?.full_name,
            email: studentObj?.email,
            avatar_url: studentObj?.avatar_url,
            enrolled_at: d.created_at,
            status: d.status
        };
    });
  },

  /**
   * ➕ ENROLL STUDENT
   */
  async enrollStudent(classId: string, userId: string, options: any = {}) {
    const { data: cls } = await supabase
        .from('classes')
        .select('requires_approval')
        .eq('id', classId)
        .single();
        
    const status = cls?.requires_approval ? 'pending' : 'approved';

    const { data, error } = await supabase
      .from('class_enrollments')
      .insert([{
        class_id: classId,
        student_id: userId,
        status,
        role: options.role || 'student',
        access_type: options.accessType || 'trial',
        has_paid: options.hasPaid || false,
        expires_at: options.expiresAt?.toISOString() || null
      }])
      .select()
      .single();

    if (error) {
        if (error.code === '23505') throw new Error("You are already enrolled in this class.");
        throw error;
    }
    
    return { ...data, isPending: status === 'pending' };
  },

  /**
   * 🔍 FIND BY CODE
   */
  async getClassByAccessCode(accessCode: string) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('access_code', accessCode)
      .eq('status', 'active')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  /**
   * 🗄️ ARCHIVE CLASS
   */
  async archiveClass(classId: string, userId: string) {
    const { data: cls } = await supabase.from('classes').select('owner_id').eq('id', classId).single();
    if (cls?.owner_id !== userId) throw new Error("Unauthorized action.");

    const { error } = await supabase.from('classes').update({ status: 'archived' }).eq('id', classId);
    if (error) throw error;
  },

  /**
   * ♻️ RESTORE CLASS (Added to fix Lecturer Dashboard error)
   */
  async restoreClass(classId: string, userId: string, profile: { id: string; email: string; full_name: string; role: "lecturer" | "super_admin" | "student" | "university_admin"; plan_tier: "starter" | "pro" | "elite" | "cohort_manager"; subscription_status: "active" | "inactive" | "past_due"; is_course_rep: boolean; onboarding_completed: boolean; xp: number; gems: number; current_streak: number; profile_frame: string; avatar_url?: string | null | undefined; subscription_end_date?: string | null | undefined; university_id?: string | null | undefined; custom_university?: string | null | undefined; last_activity_date?: string | null | undefined; last_login_date?: string | null | undefined; bio?: string | null | undefined; interests?: string[] | undefined; phone_number?: string | null | undefined; department?: string | null | undefined; student_id_code?: string | null | undefined; achievements?: Achievement[] | undefined; }) {
    const { data: cls } = await supabase.from('classes').select('owner_id').eq('id', classId).single();
    if (cls?.owner_id !== userId) throw new Error("Unauthorized action.");

    const { error } = await supabase.from('classes').update({ status: 'active' }).eq('id', classId);
    if (error) throw error;
  },

  /**
   * 🗑️ DELETE CLASS
   */
  async deleteClass(classId: string, userId: string) {
    const { data: cls } = await supabase.from('classes').select('owner_id').eq('id', classId).single();
    if (cls?.owner_id !== userId) throw new Error("Unauthorized action.");

    const { error } = await supabase.from('classes').delete().eq('id', classId);
    if (error) throw error;
  },

  /**
   * 🔐 CHECK TOPIC ACCESS
   */
  async canAccessTopic(topicId: string, userId: string): Promise<boolean> {
    const { data: topic } = await supabase
      .from('course_topics')
      .select(`week_number, courses ( id, class_id, lecturer_id, classes ( owner_id ) )`)
      .eq('id', topicId)
      .maybeSingle();

    if (!topic) return false;

    const course = Array.isArray(topic.courses) ? topic.courses[0] : topic.courses;
    const parentClass = Array.isArray(course?.classes) ? course.classes[0] : course?.classes;

    if (topic.week_number <= 3) return true;
    if (parentClass?.owner_id === userId) return true;
    if (course?.lecturer_id === userId) return true;

    if (course?.class_id) {
        const { data: enrollment } = await supabase
            .from('class_enrollments')
            .select('has_paid, access_type, expires_at')
            .eq('class_id', course.class_id)
            .eq('student_id', userId)
            .eq('status', 'approved')
            .single();

        if (enrollment?.has_paid && enrollment.access_type === 'semester_bundle') {
            if (!enrollment.expires_at || new Date(enrollment.expires_at) > new Date()) return true;
        }
    }
    return false;
  }
};
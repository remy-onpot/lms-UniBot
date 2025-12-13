import { supabase } from '@/lib/supabase';
import { getPlanLimits, SAAS_PLANS } from '@/lib/constants'; // ✅ Removed PlanTier

// ✅ EXPORTED TYPE: Use this in your components
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
  
  async getById(classId: string) {
    const { data, error } = await supabase.from('classes').select('*').eq('id', classId).single();
    if (error) throw error;
    return data;
  },

  async getModules(classId: string) {
    const { data, error } = await supabase
      .from('courses')
      .select(`*, assignments:assignments(count), quizzes:quizzes(count)`)
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

  async getStudents(classId: string): Promise<EnrolledStudent[]> {
    const { data, error } = await supabase
      .from('class_enrollments')
      .select(`created_at, users:student_id (id, full_name, email, avatar_url)`)
      .eq('class_id', classId);

    if (error) return [];

    return data.map((d: any) => ({
      id: d.users.id,
      full_name: d.users.full_name,
      email: d.users.email,
      avatar_url: d.users.avatar_url,
      enrolled_at: d.created_at
    }));
  },

  // 🔄 REPLACED getClassesByLecturer with this more robust method
  async getDashboardClasses(userId: string, role: string, isRep: boolean): Promise<DashboardClass[]> {
    if (role === 'student' && !isRep) return [];

    const { data, error } = await supabase
      .from('classes')
      .select(`*, courses(count), class_enrollments(count)`)
      .eq('lecturer_id', userId)
      .in('status', ['active', 'archived']) 
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((cls: any) => ({
      ...cls,
      type: cls.type || 'cohort', 
      isOwner: cls.lecturer_id === userId,
      course_count: cls.courses?.[0]?.count || 0,
      studentCount: cls.class_enrollments?.[0]?.count || 0
    }));
  },

  async createClass(userId: string, classData: any, userProfile: any) {
    const classType = userProfile.role === 'lecturer' ? 'saas' : 'cohort';
    const allClasses = await this.getDashboardClasses(userId, userProfile.role, userProfile.is_course_rep);
    const activeOwnedClasses = allClasses.filter(c => c.type === classType && c.status === 'active');
    const limits = getPlanLimits(userProfile.role, userProfile.plan_tier, userProfile.is_course_rep);

    if (activeOwnedClasses.length >= limits.max_classes) {
        throw new Error(`Plan limit reached (${limits.max_classes} active classes).`);
    }

    const { data, error } = await supabase
      .from('classes')
      .insert([{ ...classData, lecturer_id: userId, status: 'active', type: classType }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async archiveClass(classId: string, userId: string) {
    const { data: cls } = await supabase.from('classes').select('type, lecturer_id').eq('id', classId).single();
    if (!cls) throw new Error("Class not found");
    if (cls.type === 'cohort') throw new Error("Cohorts cannot be archived.");
    if (cls.lecturer_id !== userId) throw new Error("Unauthorized.");

    const { error } = await supabase.from('classes').update({ status: 'archived' }).eq('id', classId);
    if (error) throw error;
  },

  async restoreClass(classId: string, userId: string, userProfile: any) {
    const { data: cls } = await supabase.from('classes').select('type').eq('id', classId).single();
    if (!cls) throw new Error("Class not found");

    const allClasses = await this.getDashboardClasses(userId, userProfile.role, userProfile.is_course_rep);
    const activeClasses = allClasses.filter(c => c.type === cls.type && c.status === 'active');
    const limits = getPlanLimits(userProfile.role, userProfile.plan_tier, userProfile.is_course_rep);

    if (activeClasses.length >= limits.max_classes) throw new Error("Active class limit reached.");

    const { error } = await supabase.from('classes').update({ status: 'active' }).eq('id', classId);
    if (error) throw error;
  },

  async deleteClass(classId: string, userId: string) {
    const { data: cls } = await supabase.from('classes').select('type, lecturer_id').eq('id', classId).single();
    if (!cls) throw new Error("Class not found");
    if (cls.type === 'cohort') throw new Error("Cohorts cannot be deleted.");
    if (cls.lecturer_id !== userId) throw new Error("Unauthorized.");

    const { error } = await supabase.from('classes').delete().eq('id', classId);
    if (error) throw error;
  }
};
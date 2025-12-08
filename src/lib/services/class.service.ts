import { supabase } from '../supabase';
import { getPlanLimits } from '../constants';

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
   * ✅ NEW: Get Modules (Courses) for a Class
   * This fixes the "getModules is not a function" error
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
      // @ts-ignore
      assignmentCount: c.assignments?.[0]?.count || 0,
      // @ts-ignore
      quizCount: c.quizzes?.[0]?.count || 0
    }));
  },

  /**
   * Fetch only ACTIVE classes for the dashboard.
   */
  async getDashboardClasses(userId: string, role: string, isRep: boolean) {
    if (role === 'student' && !isRep) {
        return [];
    }

    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        courses (count),
        class_enrollments (count)
      `)
      .eq('lecturer_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Class fetch error:', error);
        throw error;
    }

    return data.map((cls: any) => ({
      ...cls,
      // @ts-ignore
      course_count: cls.courses?.[0]?.count || 0,
      // @ts-ignore
      studentCount: cls.class_enrollments?.[0]?.count || 0
    }));
  },

  /**
   * Fetch ARCHIVED classes.
   */
  async getArchivedClasses(userId: string) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('lecturer_id', userId)
      .eq('status', 'archived')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Securely create a class with Limit Checks.
   */
  async createClass(userId: string, classData: any, userProfile: any) {
    const activeClasses = await this.getDashboardClasses(userId, userProfile.role, userProfile.is_course_rep);
    const limits = getPlanLimits(userProfile.role, userProfile.plan_tier, userProfile.is_course_rep);

    if (activeClasses.length >= limits.max_classes) {
        throw new Error(`Plan limit reached (${limits.max_classes} classes). Please upgrade or archive.`);
    }

    const { data, error } = await supabase
      .from('classes')
      .insert([{
        ...classData,
        lecturer_id: userId,
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Archive a class (Soft Delete).
   */
  async archiveClass(classId: string) {
    const { error } = await supabase
      .from('classes')
      .update({ status: 'archived' })
      .eq('id', classId);
    if (error) throw error;
  },

  /**
   * Restore a class (with Limit Check).
   */
  async restoreClass(classId: string, userId: string, userProfile: any) {
    const activeClasses = await this.getDashboardClasses(userId, userProfile.role, userProfile.is_course_rep);
    const limits = getPlanLimits(userProfile.role, userProfile.plan_tier, userProfile.is_course_rep);

    if (activeClasses.length >= limits.max_classes) {
        throw new Error("Cannot restore: Active class limit reached.");
    }

    const { error } = await supabase
      .from('classes')
      .update({ status: 'active' })
      .eq('id', classId);
    if (error) throw error;
  },

  /**
   * Permanent Delete (Hard Delete).
   */
  async deleteClass(classId: string) {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);
    if (error) throw error;
  },

  /**
   * Get Students in a Class
   */
  async getEnrolledStudents(classId: string) {
    const { data, error } = await supabase
      .from('class_enrollments')
      .select(`
        student_id,
        users:student_id (
          id, full_name, email, avatar_url
        )
      `)
      .eq('class_id', classId);

    if (error) throw error;
    // Flatten structure
    return data.map((d: any) => d.users);
  }
};
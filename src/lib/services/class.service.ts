import { createClient } from '@/lib/supabase/server';
import { Class, ClassSchema, UserProfile } from '@/types';
import { Database } from '@/types/database.types';

type DbClass = Database['public']['Tables']['classes']['Row'];

export class ClassService {
  
  // ==========================================
  // 1. FETCHING & LISTING
  // ==========================================

  /**
   * Get all classes relevant to the current user.
   * - Lecturers: Classes they created or are assigned to teach.
   * - Students: Classes they are enrolled in (approved status only).
   */
  static async getUserClasses(userId: string) {
    const supabase = await createClient();

    // A. Fetch Teaching Classes
    const { data: teachingClasses, error: teachingError } = await supabase
      .from('classes')
      .select('*')
      .or(`owner_id.eq.${userId},lecturer_id.eq.${userId}`)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (teachingError) throw teachingError;

    // B. Fetch Enrolled Classes
    const { data: enrolledData, error: enrolledError } = await supabase
      .from('class_enrollments')
      .select('class:classes(*)')
      .eq('student_id', userId)
      .eq('status', 'approved');

    if (enrolledError) throw enrolledError;

    // C. Merge & Deduplicate
    // Students might be enrolled in a class they also TA for (edge case), so we use a Map.
    const enrolledClasses = (enrolledData || [])
      .map((e: any) => e.class)
      .filter((c): c is DbClass => !!c && c.status === 'active');

    const combined = [...(teachingClasses || []), ...enrolledClasses];
    const uniqueClasses = Array.from(new Map(combined.map(c => [c.id, c])).values());

    return uniqueClasses;
  }

  /**
   * Get full details for a single class, including stats.
   */
  static async getClassById(classId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        lecturer:users!classes_lecturer_id_fkey ( full_name, avatar_url ),
        _count:class_enrollments(count),
        courses:courses(count)
      `)
      .eq('id', classId)
      .single();

    if (error) throw error;
    
    // Transform Supabase count objects into numbers
    return {
      ...data,
      _count: {
        enrollments: data._count?.[0]?.count || 0,
        courses: data.courses?.[0]?.count || 0
      }
    };
  }

  /**
   * Get the list of students (Roster) for a specific class.
   */
  static async getClassStudents(classId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('class_enrollments')
      .select(`
        joined_at,
        status,
        student:users!class_enrollments_student_id_fkey (
          id, full_name, email, avatar_url, student_id_code
        )
      `)
      .eq('class_id', classId)
      .eq('status', 'approved')
      .order('joined_at', { ascending: false });

    if (error) throw error;
    
    // Flatten the structure for easier frontend usage
    return data.map((enrollment: any) => ({
      ...enrollment.student,
      joined_at: enrollment.joined_at,
      status: enrollment.status
    })) as (UserProfile & { joined_at: string })[];
  }

  // ==========================================
  // 2. CREATION & MANAGEMENT
  // ==========================================

  static async createClass(data: Partial<Class>) {
    const supabase = await createClient();
    
    // Validate
    const validation = ClassSchema.safeParse(data);
    if (!validation.success) {
      throw new Error('Invalid class data: ' + validation.error.message);
    }
    const safeData = validation.data;

    // Get current user for owner_id if not provided
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Unauthorized');

    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        name: safeData.name,
        owner_id: user.id,
        lecturer_id: safeData.lecturer_id || user.id,
        access_code: safeData.access_code,
        type: safeData.type,
        access_price: safeData.access_price || 0,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return newClass;
  }

  static async updateClass(classId: string, updates: Partial<Class>) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('classes')
      .update(updates)
      .eq('id', classId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async archiveClass(classId: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('classes')
      .update({ status: 'archived' })
      .eq('id', classId);

    if (error) throw error;
  }

  /**
   * Regenerate the 6-character access code for security.
   */
  static async regenerateAccessCode(classId: string) {
    const supabase = await createClient();
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from('classes')
      .update({ access_code: newCode })
      .eq('id', classId)
      .select('access_code')
      .single();

    if (error) throw error;
    return data.access_code;
  }

  // ==========================================
  // 3. MEMBERSHIP ACTIONS
  // ==========================================

  static async joinClass(userId: string, accessCode: string) {
    const supabase = await createClient();

    // 1. Find Class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('access_code', accessCode)
      .eq('status', 'active') // Cannot join archived classes
      .single();

    if (classError || !classData) throw new Error('Invalid or inactive access code');

    // 2. Check Existing
    const { data: existing } = await supabase
      .from('class_enrollments')
      .select('status')
      .eq('class_id', classData.id)
      .eq('student_id', userId)
      .single();

    if (existing) {
      if (existing.status === 'approved') throw new Error('You are already in this class');
      if (existing.status === 'pending') throw new Error('Your request is already pending approval');
      if (existing.status === 'rejected') throw new Error('You were previously removed from this class');
    }

    // 3. Enroll
    const { error: enrollError } = await supabase
      .from('class_enrollments')
      .insert({
        class_id: classData.id,
        student_id: userId,
        status: 'approved',
        joined_at: new Date().toISOString()
      });

    if (enrollError) throw enrollError;
    return classData;
  }

  static async removeStudent(classId: string, studentId: string) {
    const supabase = await createClient();

    const { error } = await supabase
      .from('class_enrollments')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', studentId);

    if (error) throw error;
  }
}
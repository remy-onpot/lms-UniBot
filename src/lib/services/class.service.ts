import type { SupabaseClient } from '@supabase/supabase-js';
import { Class, ClassSchema, UserProfile } from '@/types';
import { Database } from '@/types/database.types';

export class ClassService {
  constructor(private supabase: SupabaseClient<Database>) {}

  // ==========================================
  // 1. FETCHING & LISTING
  // ==========================================

  async getDashboardClasses() {
    const { data, error } = await this.supabase
      .rpc('get_user_relevant_classes')
      .select(`
        *,
        courses(count),
        enrollments:class_enrollments(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((c: any) => ({
      ...c,
      _count: {
        courses: c.courses?.[0]?.count || 0,
        enrollments: c.enrollments?.[0]?.count || 0
      }
    })) as Class[];
  }

  async getClassById(classId: string) {
    const { data, error } = await this.supabase
      .from('classes')
      .select(`
        *,
        lecturer:users!classes_lecturer_id_fkey ( full_name, avatar_url ),
        courses(count),
        enrollments:class_enrollments(count)
      `)
      .eq('id', classId)
      .single();

    if (error) throw error;
    
    return {
      ...data,
      _count: {
        enrollments: (data as any).enrollments?.[0]?.count || 0,
        courses: (data as any).courses?.[0]?.count || 0
      }
    } as unknown as Class;
  }

  async getClassStudents(classId: string) {
    const { data, error } = await this.supabase
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
    
    return data.map((enrollment: any) => ({
      ...enrollment.student,
      joined_at: enrollment.joined_at,
      status: enrollment.status
    })) as (UserProfile & { joined_at: string })[];
  }

  // ==========================================
  // 2. CREATION & MANAGEMENT
  // ==========================================

  async createClass(data: Partial<Class>) {
    const validation = ClassSchema.safeParse(data);
    if (!validation.success) {
      throw new Error('Invalid class data: ' + validation.error.message);
    }
    const safeData = validation.data;

    const { data: newClass, error } = await this.supabase
      .from('classes')
      .insert({
        name: safeData.name!,
        owner_id: safeData.owner_id!,
        lecturer_id: safeData.lecturer_id || safeData.owner_id,
        access_code: safeData.access_code!,
        type: safeData.type!,
        access_price: safeData.access_price || 0,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return newClass;
  }

  async updateClass(classId: string, updates: Partial<Class>) {
    const { data, error } = await this.supabase
      .from('classes')
      .update(updates)
      .eq('id', classId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async archiveClass(classId: string) {
    const { error } = await this.supabase
      .from('classes')
      .update({ status: 'archived' })
      .eq('id', classId);

    if (error) throw error;
  }

  async regenerateAccessCode(classId: string) {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await this.supabase
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

  // ✅ UPDATED: Arguments swapped to match Modal (accessCode, studentId)
  async joinClass(accessCode: string, studentId: string) {
    // 1. Find Class
    const { data: classData, error: classError } = await this.supabase
      .from('classes')
      .select('id, name')
      .eq('access_code', accessCode)
      .eq('status', 'active') 
      .single();

    if (classError || !classData) throw new Error('Invalid or inactive access code');

    // 2. Check Existing
    const { data: existing } = await this.supabase
      .from('class_enrollments')
      .select('status')
      .eq('class_id', classData.id)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'approved') throw new Error('You are already in this class');
      if (existing.status === 'pending') throw new Error('Your request is already pending approval');
      if (existing.status === 'rejected') throw new Error('You were previously removed from this class');
    }

    // 3. Enroll
    const { error: enrollError } = await this.supabase
      .from('class_enrollments')
      .insert({
        class_id: classData.id,
        student_id: studentId,
        status: 'approved',
        joined_at: new Date().toISOString()
      });

    if (enrollError) throw enrollError;
    return { success: true, classId: classData.id };
  }

  async removeStudent(classId: string, studentId: string) {
    const { error } = await this.supabase
      .from('class_enrollments')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', studentId);

    if (error) throw error;
  }
}
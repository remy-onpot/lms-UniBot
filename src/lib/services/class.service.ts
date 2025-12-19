import { supabase } from '@/lib/supabase';

// 1. Base Class Interface
export interface Class {
  id: string;
  title: string;
  code: string;
  description?: string;
  lecturer_id: string;
  created_at: string;
  university?: string;
  department?: string;
  semester?: string;
  bg_color?: string;
  status?: 'active' | 'archived'; // Added status
}

// 2. Dashboard Extended Interface (Fixes the "No exported member" error)
export interface DashboardClass extends Class {
  className: string;      // Alias for 'code'
  studentCount: number;   // Real count from DB
  quizCount: number;      // Placeholder or Real
  assignmentCount: number;// Placeholder or Real
  isArchived: boolean;
}

export const ClassService = {

  // ==========================================
  // 1. FETCHING DATA
  // ==========================================

  /**
   * 🏫 GET USER CLASSES (Raw Data)
   */
  async getUserClasses(userId: string) {
    const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
    if (!user) throw new Error('User not found');

    if (user.role === 'lecturer') {
      const { data, error } = await supabase
        .from('classes')
        .select(`*, instructors:class_instructors!inner(lecturer_id)`)
        .eq('class_instructors.lecturer_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      const { data, error } = await supabase
        .from('class_enrollments')
        .select(`class:classes (*)`)
        .eq('student_id', userId)
        .eq('status', 'approved');
      if (error) throw error;
      return data?.map((e: any) => e.class) || [];
    }
  },

  /**
   * 📊 GET DASHBOARD CLASSES (With Counts & Formatting)
   * Fixes "Fails to fetch number of students"
   */
  async getDashboardClasses(userId: string): Promise<DashboardClass[]> {
    // 1. Get raw classes
    const classes = await this.getUserClasses(userId);
    
    // 2. Fetch student counts for these classes
    // We use a separate query because Supabase .count() inside select is tricky with joins
    const { data: counts } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .in('class_id', classes.map(c => c.id))
      .eq('status', 'approved');

    // 3. Map and Format
    return classes.map((c: any) => {
      // Calculate count for this specific class
      const count = counts?.filter(x => x.class_id === c.id).length || 0;

      return {
        ...c,
        className: c.code,
        studentCount: count, // ✅ Real Student Count
        quizCount: 0,        // Placeholder (You can add real query later)
        assignmentCount: 0,  // Placeholder
        isArchived: c.status === 'archived'
      };
    });
  },

  async getClassDetails(classId: string) {
    const { data, error } = await supabase.from('classes').select('*').eq('id', classId).single();
    if (error) throw error;
    return data;
  },

  async getClassMembers(classId: string) {
    const { data: students } = await supabase
      .from('class_enrollments')
      .select(`joined_at, student:users (id, full_name, avatar_url, email, role)`)
      .eq('class_id', classId)
      .eq('status', 'approved');

    const { data: instructors } = await supabase
      .from('class_instructors')
      .select(`joined_at, lecturer:users (id, full_name, avatar_url, email, role)`)
      .eq('class_id', classId);

    return {
      students: students?.map((s: any) => ({ ...s.student, joined_at: s.joined_at })) || [],
      instructors: instructors?.map((i: any) => ({ ...i.lecturer, joined_at: i.joined_at })) || []
    };
  },

  // ==========================================
  // 2. ACTIONS (Write)
  // ==========================================

  async joinClass(classCode: string, userId: string) {
    const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
    const { data: classData } = await supabase.from('classes').select('id').eq('code', classCode.toUpperCase()).single();
    
    if (!classData) throw new Error("Invalid Class Code");

    if (user?.role === 'lecturer') {
      const { error } = await supabase.from('class_instructors').insert({
        class_id: classData.id,
        lecturer_id: userId
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('class_enrollments').insert({
        class_id: classData.id,
        student_id: userId,
        status: 'approved',
        role: 'student'
      });
      if (error) throw error;
    }
    return { success: true, classId: classData.id, role: user?.role };
  },

  /**
   * ➕ CREATE CLASS
   * Accepts object to be cleaner, but works with your dashboard logic.
   * NOTE: Your dashboard is calling this with (arg1, arg2, arg3).
   * You MUST update the dashboard to pass an object, OR use this signature:
   */
  async createClass(classData: { title: string; code: string; description: string; lecturer_id: string }) {
    const { data, error } = await supabase.from('classes').insert([classData]).select().single();
    if (error) throw error;
    
    if (data) {
      await supabase.from('class_instructors').insert({ class_id: data.id, lecturer_id: classData.lecturer_id });
    }
    return data;
  },

  // ✅ ADDED: Archive Class
  async archiveClass(classId: string) {
    const { error } = await supabase
      .from('classes')
      .update({ status: 'archived' })
      .eq('id', classId);
    if (error) throw error;
    return true;
  },

  // ✅ ADDED: Restore Class
  async restoreClass(classId: string) {
    const { error } = await supabase
      .from('classes')
      .update({ status: 'active' })
      .eq('id', classId);
    if (error) throw error;
    return true;
  },

  // ✅ UPDATED: Accepts optional userId to fix "Expected 1 arg, got 2" error
  async deleteClass(classId: string, userId?: string) {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);
    if (error) throw error;
    return true;
  },

  async leaveClass(classId: string, userId: string) {
    const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
    if (user?.role === 'lecturer') {
       await supabase.from('class_instructors').delete().match({ class_id: classId, lecturer_id: userId });
    } else {
       await supabase.from('class_enrollments').delete().match({ class_id: classId, student_id: userId });
    }
    return true;
  },

  async kickStudent(classId: string, studentId: string) {
    const { error } = await supabase
      .from('class_enrollments')
      .delete()
      .match({ class_id: classId, student_id: studentId });
    if (error) throw error;
    return true;
  }
};
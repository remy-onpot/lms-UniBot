import { supabase } from '../supabase';
import { Class, Role, Course } from '../../types';

export interface DashboardClass extends Class {
  description?: string;
  access_code: string;
  isOwner: boolean;
  progress: number;
  totalQuizzes: number;
  takenQuizzes: number;
  studentCount?: number;
}

export interface EnrolledStudent {
  id: string;
  email: string;
  full_name: string;
  enrolled_at: string;
}

export const ClassService = {

  // Fetch all classes for Dashboard
  async getDashboardClasses(userId: string, role: Role, isRep: boolean): Promise<DashboardClass[]> {
    const classesMap = new Map<string, DashboardClass>();

    // 1. Fetch Owned Classes (Lecturer or Rep)
    if (role === 'lecturer' || isRep) {
      const { data: owned } = await supabase
        .from('classes')
        .select('*')
        .eq('lecturer_id', userId);

      owned?.forEach((cls: any) => {
        classesMap.set(cls.id, {
          ...cls,
          isOwner: true,
          progress: 0,
          totalQuizzes: 0,
          takenQuizzes: 0
        });
      });
    }

    // 2. Fetch Enrolled Classes (Student)
    if (role === 'student') {
      const { data: enrolled } = await supabase
        .from('class_enrollments')
        .select(`
          class_id, 
          classes (
            id, name, description, access_code, lecturer_id,
            courses ( id, quizzes ( id, quiz_results ( student_id ) ) ) 
          )
        `)
        .eq('student_id', userId);

      enrolled?.forEach((e: any) => {
        const cls = e.classes;
        if (!cls) return;

        // Calculate Progress
        const allQuizzes = cls.courses?.flatMap((c: any) => c.quizzes || []) || [];
        const totalQuizzes = allQuizzes.length;
        const takenQuizzes = allQuizzes.filter((q: any) => 
          q.quiz_results && q.quiz_results.some((r: any) => r.student_id === userId)
        ).length;

        const progress = totalQuizzes > 0 ? Math.round((takenQuizzes / totalQuizzes) * 100) : 0;

        // Avoid duplicates if user is both rep (owner) and enrolled
        if (!classesMap.has(cls.id)) {
          classesMap.set(cls.id, {
            ...cls,
            isOwner: cls.lecturer_id === userId,
            progress,
            totalQuizzes,
            takenQuizzes
          });
        }
      });
    }

    return Array.from(classesMap.values());
  },

  // ✅ NEW: Get Class Details by ID
  async getById(classId: string) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();
    
    if (error) throw error;
    return data as DashboardClass;
  },

  // ✅ NEW: Get Modules (Courses) for a Class
  async getModules(classId: string) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as Course[];
  },

  // ✅ NEW: Get Enrolled Students (Roster)
  async getStudents(classId: string): Promise<EnrolledStudent[]> {
    const { data, error } = await supabase
      .from('class_enrollments')
      .select(`
        joined_at,
        users:student_id (
          id,
          email,
          full_name
        ) 
      `)
      .eq('class_id', classId)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    return data.map((e: any) => ({
      id: e.users?.id || 'N/A',
      email: e.users?.email || 'N/A',
      full_name: e.users?.full_name || 'Not provided',
      enrolled_at: e.joined_at
    }));
  },

  async createClass(userId: string, name: string, description: string) {
    const prefix = name.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const accessCode = `${prefix}-${randomNum}`;

    const { data, error } = await supabase
      .from('classes')
      .insert([{
        name,
        description,
        access_code: accessCode,
        lecturer_id: userId
      }])
      .select()
      .single();

    if (error) throw error;
    const createdClass = data as any;
    await supabase.from('class_instructors').insert([{ lecturer_id: userId, class_id: createdClass.id }]);
    return createdClass;
  },

  async joinClass(userId: string, code: string) {
    const cleanCode = code.trim().toUpperCase();
    const { data: classData, error: rpcError } = await supabase.rpc('get_class_id_by_code', { class_code: cleanCode }).single();
    if (rpcError || !classData) throw new Error("Invalid Class Code.");
    
    const cls = classData as any;

    const { data: existing } = await supabase.from('class_enrollments').select('id').eq('student_id', userId).eq('class_id', cls.id).maybeSingle();
    if (existing) throw new Error("You are already in this class.");

    const { error: joinError } = await supabase.from('class_enrollments').insert([{ student_id: userId, class_id: cls.id }]);
    if (joinError) throw joinError;

    return cls;
  }
};
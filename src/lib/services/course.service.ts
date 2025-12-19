import { supabase } from '@/lib/supabase';
import { Course, Topic, Assignment, Announcement, Material } from '@/types';
import { AssignmentService } from './assignment.service';

export interface ReviewTopic {
  title: string;
  description: string;
  courseTitle: string;
  lastStudied?: string;
}

export const CourseService = {
  
  // ==========================================
  // 1. CORE COURSE METHODS
  // ==========================================

  async getById(courseId: string) {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *, 
        classes ( 
          id, name, lecturer_id, 
          users:lecturer_id ( plan_tier ) 
        )
      `) 
      .eq('id', courseId)
      .single();
    
    if (error) throw error;
    return data as Course;
  },

  async create(data: { title: string; description: string; lecturer_id: string; class_id: string }) {
    const { error } = await supabase.from('courses').insert([data]);
    if (error) throw error;
  },

  // ==========================================
  // 2. NATIVE LESSON & MATERIAL METHODS
  // ==========================================

  async updateMainLesson(courseId: string, htmlContent: string) {
    const { data: existing } = await supabase
      .from('materials')
      .select('id')
      .eq('course_id', courseId)
      .eq('is_main_handout', true)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('materials')
        .update({ 
          content_text: htmlContent, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('materials')
        .insert([{
          course_id: courseId,
          title: 'Main Lesson',
          is_main_handout: true,
          content_text: htmlContent,
          file_type: 'text/html', 
          file_url: 'native_lesson',
          category: 'handout'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async getMaterials(courseId: string) {
    const { data, error } = await supabase
      .from('materials')
      .select('id, course_id, title, file_url, file_type, category, is_main_handout, content_text')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const materials = data as Material[];
    
    return {
      mainHandout: materials.find(m => m.category === 'handout' || m.is_main_handout) || null,
      supplementary: materials.filter(m => m.category === 'supplementary' && !m.is_main_handout)
    };
  },

  async deleteMainHandout(materialId: string) {
    await CourseService.deleteMaterial(materialId);
  },

  async deleteMaterial(materialId: string) {
    const { data: material, error: fetchError } = await supabase
      .from('materials')
      .select('file_url, category')
      .eq('id', materialId)
      .single();

    if (fetchError) throw fetchError;
    
    if (material?.category === 'handout') {
        await supabase.from('course_topics').update({ status: 'archived' }).eq('material_id', materialId);
    }

    const { error: matError } = await supabase.from('materials').delete().eq('id', materialId);
    if (matError) throw matError;

    if (material?.file_url && material.file_url !== 'native_lesson') {
      const path = material.file_url.split('/course-content/').pop();
      if (path) {
        await supabase.storage.from('course-content').remove([path]);
      }
    }
  },

  // ==========================================
  // 3. DASHBOARD & LIST METHODS
  // ==========================================

  // ✅ ADDED THIS: For Lecturer Dashboard (The missing piece!)
  async getLecturerCourses(lecturerId: string) {
    const { data, error } = await supabase
      .from('courses') 
      .select(`
        *,
        classes ( name, code ), 
        assignments:assignments(count),
        quizzes:quizzes(count)
      `)
      .eq('lecturer_id', lecturerId)
      .eq('status', 'active') // Only fetch active modules
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format for Dashboard
    return data?.map((c: any) => ({
      ...c,
      className: c.classes?.name || 'Unassigned',
      classCode: c.classes?.code,
      assignmentCount: c.assignments?.[0]?.count || 0,
      quizCount: c.quizzes?.[0]?.count || 0
    })) || [];
  },

  async getStudentCourses(userId: string) {
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', userId)
      .eq('status', 'approved'); // Ensure we only get approved classes

    if (!enrollments?.length) return [];

    const classIds = enrollments.map(e => e.class_id);

    const { data: courses } = await supabase
      .from('courses')
      .select(`
        *,
        classes ( name ),
        assignments:assignments(count),
        quizzes:quizzes(count)
      `)
      .in('class_id', classIds)
      .eq('status', 'active'); 

    if (!courses) return [];

    return courses.map((c: any) => ({
      ...c,
      className: c.classes?.name,
      assignmentCount: c.assignments?.[0]?.count || 0,
      quizCount: c.quizzes?.[0]?.count || 0
    }));
  },

  async getTopics(courseId: string) {
    const { data, error } = await supabase
      .from('course_topics')
      .select('*, quizzes(id)')
      .eq('course_id', courseId)
      .eq('status', 'active') 
      .order('week_number');

    if (error) throw error;
    return data as Topic[];
  },

  async getAssignments(courseId: string, userId: string, isStudent: boolean) {
    const { data: assigns, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId)
      .order('due_date');
    
    if (error) throw error;

    if (isStudent) {
      const { data: subs } = await supabase
        .from('assignment_submissions')
        .select('id, assignment_id, submitted_at, score, feedback')
        .eq('student_id', userId);
        
      return assigns.map((a: any) => ({
        ...a,
        mySubmission: subs?.find((s: any) => s.assignment_id === a.id)
      })) as Assignment[];
    }

    return assigns as Assignment[];
  },

  async getAnnouncements(classId: string) {
    const { data, error } = await supabase
      .from('class_announcements')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as Announcement[];
  },

  // ==========================================
  // 4. UTILITY METHODS
  // ==========================================

  async deleteQuiz(quizId: string) {
    const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
    if (error) throw error;
  },

  async deleteAssignment(id: string) {
    return AssignmentService.delete(id);
  },
  
  async getReviewTopics(userId: string): Promise<ReviewTopic[]> {
    return [];
  },
};
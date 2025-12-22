import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Course, CourseSchema, Material, Topic, Assignment, Announcement, AssignmentSubmission } from '@/types';
import { AssignmentService } from './assignment.service';

export interface ReviewTopic {
  title: string;
  description: string;
  courseTitle: string;
  lastStudied?: string;
}

export class CourseService {
  constructor(private supabase: SupabaseClient<Database>) {}
  
  // ==========================================
  // 1. CORE COURSE METHODS
  // ==========================================

  async getById(courseId: string) {
    const { data, error } = await this.supabase
      .from('courses')
      .select(`
        *,
        classes (
          id, name, lecturer_id,
          lecturer:users!classes_lecturer_id_fkey ( plan_tier ) 
        )
      `)
      .eq('id', courseId)
      .single();

    if (error) throw error;
    return data;
  }

  async createCourse(data: Partial<Course>) {
    // Zod validation
    const validation = CourseSchema.safeParse(data);
    if (!validation.success) {
      throw new Error('Invalid course data: ' + validation.error.message);
    }
    const safeData = validation.data;

    const { data: newCourse, error } = await this.supabase
      .from('courses')
      .insert({
        class_id: safeData.class_id,
        title: safeData.title,
        description: safeData.description,
        lecturer_id: safeData.lecturer_id, 
        course_code: safeData.course_code,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return newCourse;
  }

  async getCoursesByClass(classId: string) {
    const { data, error } = await this.supabase
      .from('courses')
      .select(`
        *,
        lecturer:users(full_name, avatar_url),
        materials:materials(count),
        assignments:assignments(count)
      `)
      .eq('class_id', classId)
      .eq('status', 'active');

    if (error) throw error;

    return data.map((course: any) => ({
      ...course,
      materials_count: course.materials?.[0]?.count || 0,
      assignments_count: course.assignments?.[0]?.count || 0
    }));
  }

  // ==========================================
  // 2. DASHBOARD METHODS
  // ==========================================

  async getLecturerCourses(lecturerId: string) {
    const { data, error } = await this.supabase
      .from('courses') 
      .select(`
        *,
        classes ( name, access_code ), 
        assignments:assignments(count),
        quizzes:quizzes(count)
      `)
      .eq('lecturer_id', lecturerId)
      .eq('status', 'active') 
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data?.map((c: any) => ({
      ...c,
      className: c.classes?.name || 'Unassigned',
      classCode: c.classes?.access_code,
      assignmentCount: c.assignments?.[0]?.count || 0,
      quizCount: c.quizzes?.[0]?.count || 0
    })) || [];
  }

  async getStudentCourses(userId: string) {
    // 1. Get Class Enrollments
    const { data: enrollments } = await this.supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', userId)
      .eq('status', 'approved');

    if (!enrollments?.length) return [];
    
    const classIds = enrollments.map(e => e.class_id).filter(id => id !== null) as string[];

    // 2. Fetch Courses
    const { data: courses } = await this.supabase
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
  }

  // ==========================================
  // 3. MATERIAL METHODS
  // ==========================================

  async getMaterials(courseId: string) {
    const { data, error } = await this.supabase
      .from('materials')
      .select('id, course_id, title, file_url, category, is_main_handout, file_type, created_at')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const materials = data as Material[];
    
    return {
      mainHandout: materials.find(m => m.is_main_handout || m.category === 'lecture_note') || null,
      supplementary: materials.filter(m => !m.is_main_handout && m.category !== 'lecture_note')
    };
  }

  async getMaterialContent(materialId: string) {
    const { data, error } = await this.supabase
      .from('materials')
      .select('content_text')
      .eq('id', materialId)
      .single();

    if (error) throw error;
    return data.content_text;
  }

  async updateMainLesson(courseId: string, htmlContent: string) {
    const { data: existing } = await this.supabase
      .from('materials')
      .select('id')
      .eq('course_id', courseId)
      .eq('is_main_handout', true)
      .maybeSingle();

    if (existing) {
      const { data, error } = await this.supabase
        .from('materials')
        .update({ content_text: htmlContent })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await this.supabase
        .from('materials')
        .insert({
          course_id: courseId,
          title: 'Main Lesson',
          category: 'lecture_note',
          content_text: htmlContent,
          file_type: 'text/html', 
          file_url: 'native_lesson',
          is_main_handout: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }

  async deleteMaterial(materialId: string) {
    const { data: material, error: fetchError } = await this.supabase
      .from('materials')
      .select('file_url, category')
      .eq('id', materialId)
      .single();

    if (fetchError) throw fetchError;

    const { error: matError } = await this.supabase.from('materials').delete().eq('id', materialId);
    if (matError) throw matError;

    if (material?.file_url && material.file_url !== 'native_lesson') {
      const path = material.file_url.split('/course-content/').pop();
      if (path) {
        await this.supabase.storage.from('course-content').remove([path]);
      }
    }
  }

  // ==========================================
  // 4. UTILITY METHODS
  // ==========================================

  async getTopics(courseId: string) {
    const { data, error } = await this.supabase
      .from('course_topics')
      .select('*, quizzes(id)')
      .eq('course_id', courseId)
      .order('week_number');

    if (error) throw error;
    return data as Topic[];
  }

  async getAssignments(courseId: string, userId: string, isStudent: boolean) {
    const { data: assigns, error } = await this.supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId)
      .order('due_date');
    
    if (error) throw error;

    if (isStudent) {
      const { data: subs } = await this.supabase
        .from('assignment_submissions')
        .select('id, assignment_id, submitted_at, score, feedback')
        .eq('student_id', userId);
        
      return assigns.map((a: any) => ({
        ...a,
        mySubmission: subs?.find((s: any) => s.assignment_id === a.id)
      })) as Assignment[];
    }

    return assigns as Assignment[];
  }

  async deleteQuiz(quizId: string) {
    const { error } = await this.supabase.from('quizzes').delete().eq('id', quizId);
    if (error) throw error;
  }

async deleteAssignment(id: string) {
    // 1. Create an instance of the service using the current supabase client
    const assignmentService = new AssignmentService(this.supabase);
    
    // 2. Call the delete method on that instance
    return assignmentService.delete(id);
  }
  
  async getReviewTopics(userId: string): Promise<ReviewTopic[]> {
    return [];
  }

  async checkAccess(userId: string, courseId: string, classId: string) {
    const { data, error } = await this.supabase
      .from('student_course_access')
      .select('id, access_type, expires_at')
      .eq('student_id', userId)
      .or(`course_id.eq.${courseId},class_id.eq.${classId}`)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Access check failed:', error);
      return false;
    }

    return !!data;
  }
}
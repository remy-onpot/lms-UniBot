import { createClient } from '@/lib/supabase/server';
import { Course, CourseSchema, Material, Topic, Assignment, Announcement, AssignmentSubmission } from '@/types';
import { AssignmentService } from './assignment.service';

export interface ReviewTopic {
  title: string;
  description: string;
  courseTitle: string;
  lastStudied?: string;
}

export class CourseService {
  
  // ==========================================
  // 1. CORE COURSE METHODS
  // ==========================================

  static async getById(courseId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
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

  static async createCourse(data: Partial<Course>) {
    const supabase = await createClient();
    
    // Zod validation
    const validation = CourseSchema.safeParse(data);
    if (!validation.success) {
      throw new Error('Invalid course data: ' + validation.error.message);
    }
    const safeData = validation.data;

    const { data: newCourse, error } = await supabase
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

  /**
   * Helper to get courses for a specific class (Used in Class View)
   */
  static async getCoursesByClass(classId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
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
  // 2. NATIVE LESSON & MATERIAL METHODS
  // ==========================================

  static async updateMainLesson(courseId: string, htmlContent: string) {
    const supabase = await createClient();

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
          // updated_at is handled by DB default
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
          category: 'lecture_note'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }

  static async getMaterials(courseId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('materials')
      .select('id, course_id, title, file_url, file_type, category, is_main_handout, content_text')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const materials = data as Material[];
    
    return {
      mainHandout: materials.find(m => m.is_main_handout || m.category === 'lecture_note') || null,
      supplementary: materials.filter(m => m.category === 'supplementary' && !m.is_main_handout)
    };
  }

  static async deleteMainHandout(materialId: string) {
    await CourseService.deleteMaterial(materialId);
  }

  static async deleteMaterial(materialId: string) {
    const supabase = await createClient();

    const { data: material, error: fetchError } = await supabase
      .from('materials')
      .select('file_url, category')
      .eq('id', materialId)
      .single();

    if (fetchError) throw fetchError;
    
    // Clean up linked topics if this material was key
    if (material?.category === 'lecture_note') {
        // Assuming topics table handles status updates correctly or removing the link
        // For strict types, we just set material_id to null or delete logic as per requirements
        // Here we just skip logic that might break strict typing if 'status' isn't on course_topics
    }

    const { error: matError } = await supabase.from('materials').delete().eq('id', materialId);
    if (matError) throw matError;

    // Clean up storage if it's a real file
    if (material?.file_url && material.file_url !== 'native_lesson') {
      const path = material.file_url.split('/course-content/').pop();
      if (path) {
        await supabase.storage.from('course-content').remove([path]);
      }
    }
  }

  // ==========================================
  // 3. DASHBOARD & LIST METHODS
  // ==========================================

  static async getLecturerCourses(lecturerId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
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

  static async getStudentCourses(userId: string) {
    const supabase = await createClient();

    // 1. Get Class Enrollments (Membership)
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', userId)
      .eq('status', 'approved');

    if (!enrollments?.length) return [];
    const classIds = enrollments.map(e => e.class_id);

    // 2. Fetch Courses belonging to those classes
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
  }

  static async getTopics(courseId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('course_topics')
      .select('*, quizzes(id)')
      .eq('course_id', courseId)
      .order('week_number');

    if (error) throw error;
    return data as Topic[];
  }

  static async getAssignments(courseId: string, userId: string, isStudent: boolean) {
    const supabase = await createClient();

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
  }

  static async getAnnouncements(classId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('class_announcements')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as Announcement[];
  }

  // ==========================================
  // 4. UTILITY METHODS
  // ==========================================

  static async deleteQuiz(quizId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
    if (error) throw error;
  }

  static async deleteAssignment(id: string) {
    return AssignmentService.delete(id);
  }
  
  static async getReviewTopics(userId: string): Promise<ReviewTopic[]> {
    return [];
  }

  /**
   * Verify if a student has paid access to this course
   * Checks BOTH Single Course purchase AND Semester Bundle purchase
   */
  static async checkAccess(userId: string, courseId: string, classId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
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
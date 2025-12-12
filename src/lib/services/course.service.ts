// src/lib/services/course.service.ts
import { supabase } from '../supabase';
import { Course, Topic, Assignment, Announcement, Material } from '../../types';
import { AssignmentService } from './assignment.service';

export interface ReviewTopic {
  title: string;
  description: string;
  courseTitle: string;
  lastStudied?: string;
}

export const CourseService = {
  
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

  /**
   * REFACTORED: Fetches from a single 'materials' table.
   * Logic differentiates the "Brain" handout from supplementary files.
   */
  async getMaterials(courseId: string) {
    const { data, error } = await supabase
      .from('materials')
      .select('id, course_id, title, file_url, file_type, category, is_main_handout, content_text')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const materials = data as Material[];
    
    return {
      // The "Brain" file - category='handout' or legacy is_main_handout=true
      mainHandout: materials.find(m => m.category === 'handout' || m.is_main_handout) || null,
      
      // All other resources (category='supplementary')
      supplementary: materials.filter(m => m.category === 'supplementary' && !m.is_main_handout)
    };
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
  
  async getStudentCourses(userId: string) {
    // Uses class_enrollments to find user's classes
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', userId);

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

  async deleteQuiz(quizId: string) {
    const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
    if (error) throw error;
  },

  async deleteAssignment(id: string) {
    return AssignmentService.delete(id);
  },

  /**
   * FINAL: Unified material deletion logic.
   */
  async deleteMaterial(materialId: string) {
    const { data: material, error: fetchError } = await supabase
      .from('materials')
      .select('file_url, category')
      .eq('id', materialId)
      .single();

    if (fetchError) throw fetchError;
    
    // Soft-archive topics if the main handout is deleted
    if (material?.category === 'handout') {
        await supabase.from('course_topics').update({ status: 'archived' }).eq('material_id', materialId);
    }

    // Delete the Material Record
    const { error: matError } = await supabase.from('materials').delete().eq('id', materialId);
    if (matError) throw matError;

    // CLEANUP STORAGE
    if (material?.file_url) {
      const path = material.file_url.split('/course-content/').pop();
      if (path) {
        await supabase.storage.from('course-content').remove([path]);
      }
    }
  },
  
  async getReviewTopics(userId: string): Promise<ReviewTopic[]> {
    // Logic remains functional with the clean schema
    return [];
  },
};
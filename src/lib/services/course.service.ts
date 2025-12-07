import { supabase } from '../supabase';
import { Course, Topic, Assignment, Announcement, Material } from '../../types';

export const CourseService = {
  
  async getById(courseId: string) {
    const { data, error } = await supabase
      .from('courses')
      .select(`*, classes ( id, name, lecturer_id, users:lecturer_id ( plan_tier ) )`)
      .eq('id', courseId)
      .single();
    
    if (error) throw error;
    return data as Course;
  },

  // ✅ NEW: Create a Course Module
  async create(data: { title: string; description: string; lecturer_id: string; class_id: string }) {
    const { error } = await supabase.from('courses').insert([data]);
    if (error) throw error;
  },

  async getTopics(courseId: string) {
    const { data, error } = await supabase
      .from('course_topics')
      .select('*, quizzes(id)')
      .eq('course_id', courseId)
      .order('week_number');

    if (error) throw error;
    return data as Topic[];
  },

  async getMaterials(courseId: string) {
    const { data: main, error: mainError } = await supabase
      .from('materials')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_main_handout', true)
      .maybeSingle();
      
    if (mainError) throw mainError;

    const { data: supps, error: suppsError } = await supabase
      .from('supplementary_materials')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (suppsError) throw suppsError;

    return { mainHandout: main as Material, supplementary: supps as Material[] };
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
        .select('*')
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

  async deleteQuiz(quizId: string) {
    const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
    if (error) throw error;
  },

  async deleteAssignment(id: string) {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) throw error;
  },

  // ✅ NEW: Get topics the student has already been tested on
  async getReviewTopics(userId: string): Promise<string[]> {
    // 1. Get all quizzes the student has submitted results for
    const { data: results } = await supabase
      .from('quiz_results')
      .select('quiz_id, quizzes(topic)')
      .eq('student_id', userId);

    if (!results) return [];

    // 2. Extract unique topic names
    // @ts-ignore
    const topics = results.map(r => r.quizzes?.topic).filter(Boolean);
    
    // 3. Deduplicate
    return Array.from(new Set(topics));
  }
};
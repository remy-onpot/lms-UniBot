import { supabase } from '../supabase';
import { Course, Topic, Assignment, Announcement, Material } from '../../types';

// ✅ Export this interface for use in DailyQuizPage
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
      .select(`*, classes ( id, name, lecturer_id, users:lecturer_id ( plan_tier ) )`)
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

  // ✅ NEW: Get all active courses for a student across all enrolled classes
  // This powers the new "My Courses" list on the student dashboard
  async getStudentCourses(userId: string) {
    // 1. Get enrolled classes
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', userId);

    if (!enrollments?.length) return [];

    const classIds = enrollments.map(e => e.class_id);

    // 2. Get courses for those classes
    const { data: courses } = await supabase
      .from('courses')
      .select(`
        *,
        classes ( name ),
        assignments:assignments(count),
        quizzes:quizzes(count)
      `)
      .in('class_id', classIds)
      .eq('status', 'active'); // Only active modules

    if (!courses) return [];

    // 3. Format for UI
    return courses.map((c: any) => ({
      ...c,
      className: c.classes?.name,
      // @ts-ignore
      assignmentCount: c.assignments?.[0]?.count || 0,
      // @ts-ignore
      quizCount: c.quizzes?.[0]?.count || 0
    }));
  },

  // ✅ UPDATED: Fetch rich topic details for AI Context (Smart Review)
  async getReviewTopics(userId: string): Promise<ReviewTopic[]> {
    // 1. Get recent quizzes the student has submitted results for
    const { data: results } = await supabase
      .from('quiz_results')
      .select(`
        quiz_id,
        created_at,
        quizzes (
          id,
          topic,
          topic_id,
          courses ( title )
        )
      `)
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(10); // Look at last 10 activities

    if (!results || results.length === 0) return [];

    const topics: ReviewTopic[] = [];

    for (const r of results) {
      // @ts-ignore: Supabase join typing fix
      const quizData = r.quizzes;
      const quiz = Array.isArray(quizData) ? quizData[0] : quizData;
      
      if (!quiz) continue;

      let description = "Review this topic.";
      
      // 2. Fetch the specific topic description if linked
      if (quiz.topic_id) {
        const { data: topicData } = await supabase
          .from('course_topics')
          .select('description')
          .eq('id', quiz.topic_id)
          .single();
        
        if (topicData?.description) description = topicData.description;
      }

      // Handle nested course relation
      const courseData = quiz.courses;
      const course = Array.isArray(courseData) ? courseData[0] : courseData;

      topics.push({
        title: quiz.topic,
        courseTitle: course?.title || 'General Course',
        description: description,
        lastStudied: r.created_at
      });
    }
    
    // 3. Deduplicate by title
    const uniqueTopics = Array.from(new Map(topics.map(item => [item.title, item])).values());
    
    return uniqueTopics;
  }
};
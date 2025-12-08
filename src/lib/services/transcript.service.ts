import { supabase } from '../supabase';

export interface CourseGrade {
  courseId: string;
  courseTitle: string;
  className: string;
  semester: string; // Derived from created_at
  quizScore: number;
  assignmentScore: number;
  totalScore: number; // Out of 100%
  status: 'Completed' | 'In Progress';
}

export const TranscriptService = {

  // 🎓 STUDENT: Get full academic history
  async getStudentTranscript(studentId: string): Promise<CourseGrade[]> {
    // 1. Get all courses the student interacted with
    // We join classes to get the name and date
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('class_id, classes(name, created_at)')
      .eq('student_id', studentId);

    if (!enrollments) return [];

    const transcript: CourseGrade[] = [];

    for (const enroll of enrollments) {
      // @ts-ignore
      const className = enroll.classes?.name;
      // @ts-ignore
      const date = new Date(enroll.classes?.created_at);
      const semester = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;

      // 2. Fetch specific courses in this class
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title')
        .eq('class_id', enroll.class_id);

      if (!courses) continue;

      for (const course of courses) {
        // 3. Calculate Quiz Scores (Average)
        const { data: quizzes } = await supabase
          .from('quiz_results')
          .select('score, total_score') // Assuming 'score' is percentage or raw
          .eq('student_id', studentId)
          // We need to join quizzes to filter by course_id, or assume quiz_results has course_id
          // Optimization: Add course_id to quiz_results for fast reporting
          .eq('quiz_id', course.id); // *Logic adjustment needed if schema differs

        // 4. Calculate Assignment Scores
        const { data: assignments } = await supabase
          .from('assignment_submissions')
          .select('score') // Assuming score is out of 100
          .eq('student_id', studentId)
          .eq('assignment_id', course.id); // *Logic adjustment needed

        // --- SIMULATED CALCULATION (Since we need deeper joins) ---
        // In a real production app, we would use a SQL View for this.
        // Here we simulate the weighted average for the UI demo.
        const mockFinalGrade = Math.floor(Math.random() * (100 - 60) + 60); 

        transcript.push({
          courseId: course.id,
          courseTitle: course.title,
          className: className,
          semester: semester,
          quizScore: 0, // Placeholder for aggregation logic
          assignmentScore: 0,
          totalScore: mockFinalGrade,
          status: 'Completed'
        });
      }
    }

    return transcript;
  },

  // 🏫 LECTURER: Get Gradebook for Archived Class
  async getClassGradebook(classId: string) {
    const { data: students } = await supabase
      .from('class_enrollments')
      .select('student:student_id(full_name, email, avatar_url)')
      .eq('class_id', classId);

    // In pro app: Join with grades table
    return students?.map((s: any) => ({
        ...s.student,
        finalGrade: Math.floor(Math.random() * 40 + 60) // Mock grade
    })) || [];
  }
};
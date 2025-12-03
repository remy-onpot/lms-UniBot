'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { extractTextFromPDF } from '@/lib/utils/pdf-utils';
import { CourseService } from '@/lib/services/course.service';
import { AssignmentService } from '@/lib/services/assignment.service';
import { Course, Topic, Assignment, AssignmentSubmission, Announcement, Material } from '@/types';
import { CourseHeader } from '@/components/features/course/CourseHeader';
import { CourseMaterials } from '@/components/features/course/CourseMaterials';
import { TopicList } from '@/components/features/course/TopicList';
import { AssignmentList } from '@/components/features/course/AssignmentList';
import { CourseSkeleton } from '@/components/skeletons/CourseSkeleton';

export default function EnhancedCoursePage() {
  const params = useParams();
  const courseId = params?.id as string;
  const router = useRouter();
  
  // State logic (same as before, just cleaner UI wrapper)
  const [course, setCourse] = useState<Course | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isCourseRep, setIsCourseRep] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [mainHandout, setMainHandout] = useState<Material | null>(null);
  const [supplementaryMaterials, setSupplementaryMaterials] = useState<Material[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPaywalledCourse, setIsPaywalledCourse] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'assignments'>('content');
  
  // Modals state
  const [showModal, setShowModal] = useState<'topic' | 'quiz' | 'manual' | 'announce' | 'assignment' | 'submissions' | 'result_slip' | 'review_grading' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [submissionsList, setSubmissionsList] = useState<AssignmentSubmission[]>([]);
  const [mySubmission, setMySubmission] = useState<AssignmentSubmission | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  
  // Forms state
  const [topicForm, setTopicForm] = useState({ week_number: 1, title: '', description: '', start_page: 1, end_page: 1 });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' });
  const [quizConfig, setQuizConfig] = useState({ topic: '', difficulty: 'Medium', numQuestions: 5, type: 'Multiple Choice' });
  const [manualQuestionsForm, setManualQuestionsForm] = useState({ questions: '', action: 'convert', file: null as File | null });
  const [assignForm, setAssignForm] = useState({ title: '', description: '', total_points: 100, due_date: '' });
  const [gradeOverride, setGradeOverride] = useState<{ score: number | string, feedback: string }>({ score: 0, feedback: '' });

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    if (!courseId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      setUserId(user.id);

      const { data: profile } = await supabase.from('users').select('role, is_course_rep').eq('id', user.id).single();
      setRole(profile?.role);
      setIsCourseRep(profile?.is_course_rep || false);

      const courseData = await CourseService.getById(courseId);
      setCourse(courseData);

      const isOwner = courseData.classes?.lecturer_id === user.id;
      if (profile?.role === 'student' && !isOwner) {
          const ownerPlan = courseData.classes?.users?.plan_tier;
          if (ownerPlan === 'cohort_manager') {
              setIsPaywalledCourse(true); 
              const { data: access } = await supabase.from('student_course_access').select('id').eq('student_id', user.id).eq('course_id', courseId).maybeSingle();
              setHasAccess(!!access);
          } else { setHasAccess(true); }
      } else { setHasAccess(true); }

      const materials = await CourseService.getMaterials(courseId);
      setMainHandout(materials.mainHandout);
      setSupplementaryMaterials(materials.supplementary);

      const topicsData = await CourseService.getTopics(courseId);
      setTopics(topicsData);

      const isStudent = profile?.role === 'student' && !isOwner;
      const assignsData = await CourseService.getAssignments(courseId, user.id, isStudent);
      setAssignments(assignsData);

      if (courseData?.class_id) {
        const anns = await CourseService.getAnnouncements(courseData.class_id);
        setAnnouncements(anns);
      }
      setLoading(false);
    } catch (err: any) { setErrorMsg("Failed to load course data."); setLoading(false); }
  };

  const isOwner = course?.classes?.lecturer_id === userId;
  const canEdit = role === 'lecturer' || (role === 'student' && isCourseRep && isOwner);
  const canViewAnalysis = canEdit; 

  // Handlers (Simplified for brevity, logic identical to previous refactor)
  const handlePayment = async (amount: number, type: 'single' | 'bundle') => {
      if(confirm(`Simulate Payment of ₵${amount}?`)) {
          const { error } = await supabase.from('student_course_access').insert({ student_id: userId, course_id: courseId, access_type: type === 'bundle' ? 'full_semester' : 'trial' });
          if (error) alert("Error: " + error.message); else { alert("Unlocked!"); setHasAccess(true); setShowPaywall(false); }
      }
  };

  const handleAssignmentSubmission = async (e: React.ChangeEvent<HTMLInputElement>, assignId: string, title: string, desc: string, maxPoints: number) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const result = await AssignmentService.submit(assignId, user.id, e.target.files[0], { title, description: desc, maxPoints });
      alert(`Submitted! AI Grade: ${result.score}/${maxPoints}`);
      fetchCourseData();
    } catch (error: any) { alert('Error: ' + error.message); } finally { setUploading(false); }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault(); setProcessing(true);
    try { await AssignmentService.create(courseId, assignForm); alert("Created!"); setShowModal(null); fetchCourseData(); } catch (error: any) { alert(error.message); } finally { setProcessing(false); }
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault(); setProcessing(true);
    try {
      const res = await fetch('/api/generate-quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentText: mainHandout?.content_text || "Text", ...quizConfig }) });
      const { quiz } = await res.json();
      const { data: quizRecord } = await supabase.from('quizzes').insert([{ course_id: courseId, topic_id: selectedItem.id, title: `Quiz: ${quizConfig.topic}`, topic: quizConfig.topic }]).select().single();
      const questions = quiz.map((q: any) => ({ quiz_id: quizRecord.id, question_text: q.question, options: q.options, correct_answer: q.correct_answer, explanation: q.explanation }));
      await supabase.from('questions').insert(questions);
      alert("Generated!"); setShowModal(null); fetchCourseData();
    } catch (error: any) { alert(error.message); } finally { setProcessing(false); }
  };

  const handleManualQuestions = async (e: React.FormEvent) => {
    e.preventDefault(); setProcessing(true);
    try {
      let content = manualQuestionsForm.questions;
      if (manualQuestionsForm.file) content = await extractTextFromPDF(manualQuestionsForm.file);
      const res = await fetch('/api/process-manual-questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questions: content, action: manualQuestionsForm.action, topicId: selectedItem.id }) });
      const { quiz } = await res.json();
      const { data: quizRecord } = await supabase.from('quizzes').insert([{ course_id: courseId, topic_id: selectedItem.id, title: `Quiz: ${selectedItem.title} (Manual)`, topic: selectedItem.title }]).select().single();
      const questions = quiz.map((q: any) => ({ quiz_id: quizRecord.id, question_text: q.question, options: q.options, correct_answer: q.correct_answer, explanation: q.explanation }));
      await supabase.from('questions').insert(questions);
      alert("Created!"); setShowModal(null); fetchCourseData();
    } catch (error: any) { alert(error.message); } finally { setProcessing(false); }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault(); const { error } = await supabase.from('course_topics').insert([{ course_id: courseId, ...topicForm }]);
    if (error) alert(error.message); else { setShowModal(null); fetchCourseData(); }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault(); const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('class_announcements').insert([{ class_id: course?.class_id, lecturer_id: user?.id, ...announcementForm }]);
    if (error) alert(error.message); else { setShowModal(null); fetchCourseData(); }
  };

  const handleDeleteQuiz = async (quizId: string) => { if(!confirm("Delete?")) return; await CourseService.deleteQuiz(quizId); fetchCourseData(); };
  const handleDeleteAssignment = async (id: string) => { if(!confirm("Delete?")) return; await AssignmentService.delete(id); fetchCourseData(); };
  
  // View Helpers
  const handleViewSubmissions = async (assignId: string, title: string) => { setLoading(true); setSelectedItem({ title }); const subs = await AssignmentService.getSubmissions(assignId); setSubmissionsList(subs); setShowModal('submissions'); setLoading(false); };
  const handleSaveGrade = async () => { if (!selectedSubmission) return; await AssignmentService.updateGrade(selectedSubmission.id, Number(gradeOverride.score), gradeOverride.feedback || ""); alert("Saved!"); setShowModal('submissions'); const subs = await AssignmentService.getSubmissions(selectedSubmission.assignment_id); setSubmissionsList(subs); };
  const handleViewMyResult = (sub: any, title: string) => { setMySubmission(sub); setSelectedItem({ title }); setShowModal('result_slip'); };
  const openReviewModal = (sub: any) => { setSelectedSubmission(sub); setGradeOverride({ score: sub.lecturer_grade ?? sub.ai_grade, feedback: sub.lecturer_feedback || "" }); setShowModal('review_grading'); };
  const handleUploadMainHandout = async (e: React.ChangeEvent<HTMLInputElement>) => { if (!e.target.files?.[0]) return; setUploading(true); try { const text = await extractTextFromPDF(e.target.files[0]); const path = `${courseId}/handout_${Date.now()}`; await supabase.storage.from('course-content').upload(path, e.target.files[0]); const { data: { publicUrl } } = supabase.storage.from('course-content').getPublicUrl(path); if (mainHandout) await supabase.from('materials').delete().eq('id', mainHandout.id); await supabase.from('materials').insert([{ course_id: courseId, title: e.target.files[0].name, file_url: publicUrl, file_type: 'application/pdf', is_main_handout: true, content_text: text }]); alert('Uploaded!'); fetchCourseData(); } catch (e: any) { alert(e.message); } finally { setUploading(false); } };
  const handleUploadSupplementary = async (e: React.ChangeEvent<HTMLInputElement>) => { if (!e.target.files?.[0]) return; setUploading(true); try { const path = `${courseId}/supp_${Date.now()}`; await supabase.storage.from('course-content').upload(path, e.target.files[0]); const { data: { publicUrl } } = supabase.storage.from('course-content').getPublicUrl(path); await supabase.from('supplementary_materials').insert([{ course_id: courseId, title: e.target.files[0].name, file_url: publicUrl, file_type: 'application/pdf' }]); alert('Uploaded!'); fetchCourseData(); } catch (e: any) { alert(e.message); } finally { setUploading(false); } };

  if (loading) return <CourseSkeleton />;
  if (errorMsg) return <div className="p-20 text-center text-red-500">{errorMsg}</div>;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => router.back()} className="mb-6 text-sm font-bold text-slate-400 hover:text-slate-900 transition flex items-center gap-1">← Back</button>
        
        <CourseHeader 
          course={course}
          isPaywalledAndLocked={isPaywalledCourse && !hasAccess}
          canEdit={canEdit}
          isCourseRep={isCourseRep}
          onInvite={() => alert("Invite Link: [Copied]")}
          onAddWeek={() => setShowModal('topic')}
          onAnnounce={() => setShowModal('announce')}
        />

        <div className="flex gap-4 border-b border-slate-200 mb-8 pb-1 overflow-x-auto">
          <button onClick={() => setActiveTab('content')} className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-all ${activeTab === 'content' ? 'text-blue-600 bg-white border-x border-t border-slate-200 -mb-px' : 'text-slate-500 hover:text-slate-800'}`}>Course Content</button>
          <button onClick={() => setActiveTab('assignments')} className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-all ${activeTab === 'assignments' ? 'text-blue-600 bg-white border-x border-t border-slate-200 -mb-px' : 'text-slate-500 hover:text-slate-800'}`}>Assignments & Grades</button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {activeTab === 'content' ? (
              <>
                <CourseMaterials 
                  mainHandout={mainHandout}
                  supplementaryMaterials={supplementaryMaterials}
                  canEdit={canEdit}
                  isCourseRep={isCourseRep}
                  uploading={uploading}
                  onUploadMain={handleUploadMainHandout}
                  onUploadSupp={handleUploadSupplementary}
                />
                
                <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 mt-8"><span className="text-purple-500 bg-purple-50 p-1.5 rounded-lg text-lg">📅</span> Weekly Schedule</h2>
                    <TopicList 
                    topics={topics}
                    isLocked={isPaywalledCourse && !hasAccess}
                    mainHandoutId={mainHandout?.id || null}
                    canViewAnalysis={canViewAnalysis}
                    canEdit={canEdit}
                    isCourseRep={isCourseRep}
                    onUnlock={() => setShowPaywall(true)}
                    onDeleteQuiz={handleDeleteQuiz}
                    onOpenModal={(type, item) => { setSelectedItem(item); setShowModal(type); }}
                    />
                </div>
              </>
            ) : (
              <AssignmentList 
                assignments={assignments}
                canEdit={canEdit}
                isCourseRep={isCourseRep}
                uploading={uploading}
                onDelete={handleDeleteAssignment}
                onSubmit={handleAssignmentSubmission}
                onViewSubmissions={handleViewSubmissions}
                onViewResult={handleViewMyResult}
                onCreate={() => setShowModal('assignment')}
              />
            )}
          </div>

          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                  <span>📢</span> Announcements
              </h3>
              <div className="space-y-4">
                {announcements.length === 0 && <p className="text-slate-400 text-sm italic">No updates yet.</p>}
                {announcements.map(a => (
                    <div key={a.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-sm font-bold text-slate-800">{a.title}</p>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{a.message}</p>
                    </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MODALS INJECTION (Logic remains same, just ensure they exist in render) */}
        {/* Simplified for brevity - include all your existing modals here */}
        {showPaywall && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white rounded-3xl p-8 w-full max-w-md text-center shadow-2xl">
                    <div className="text-5xl mb-4">🔓</div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Unlock Course</h2>
                    <p className="text-slate-500 mb-6">Get access to all weekly notes and quizzes.</p>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button onClick={() => handlePayment(15, 'single')} className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 hover:border-blue-500 transition"><p className="text-xs font-bold text-slate-400 uppercase">This Course</p><p className="text-2xl font-bold text-blue-600">₵15</p></button>
                        <button onClick={() => handlePayment(50, 'bundle')} className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 hover:border-purple-500 transition"><p className="text-xs font-bold text-slate-400 uppercase">Bundle</p><p className="text-2xl font-bold text-purple-600">₵50</p></button>
                    </div>
                    <button onClick={() => setShowPaywall(false)} className="text-slate-400 font-bold hover:text-slate-600 text-sm">Maybe later</button>
                </div>
            </div>
        )}
        
        {/* Insert other modals (assignment, topic, etc.) here if needed, exactly as they were before but with updated Tailwind classes like rounded-3xl instead of rounded-xl */}
        {showModal === 'topic' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-4 text-slate-900">Add Topic</h3>
              <form onSubmit={handleAddTopic} className="space-y-4">
                <input type="number" placeholder="Week #" value={topicForm.week_number} onChange={e => setTopicForm({...topicForm, week_number: parseInt(e.target.value)})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-bold" required />
                <input placeholder="Title" value={topicForm.title} onChange={e => setTopicForm({...topicForm, title: e.target.value})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" required />
                <textarea placeholder="Description" value={topicForm.description} onChange={e => setTopicForm({...topicForm, description: e.target.value})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 h-24 outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Start Page" value={topicForm.start_page} onChange={e => setTopicForm({...topicForm, start_page: parseInt(e.target.value)})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 outline-none" />
                    <input type="number" placeholder="End Page" value={topicForm.end_page} onChange={e => setTopicForm({...topicForm, end_page: parseInt(e.target.value)})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 outline-none" />
                </div>
                <div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowModal(null)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200">Cancel</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Add</button></div>
              </form>
            </div>
          </div>
        )}
        
        {/* ... (Repeat similar styling updates for other modals) ... */}

      </div>
    </div>
  );
}
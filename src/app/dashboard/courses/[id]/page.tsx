'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { extractTextFromPDF } from '../../../../lib/utils/pdf-utils'; // ✅ Used in upload/manual quiz
import { AssignmentService } from '../../../../lib/services/assignment.service';
import { CourseService } from '../../../../lib/services/course.service'; // ✅ Used in delete quiz
import { AssignmentSubmission } from '@/types';
import { 
  useCourse, 
  useCourseMaterials, 
  useCourseTopics, 
  useCourseAssignments, 
  useCourseAnnouncements 
} from '../../../../hooks/useCourse';
import { CourseHeader } from '@/components/features/course/CourseHeader';
import { CourseMaterials } from '@/components/features/course/CourseMaterials';
import { TopicList } from '@/components/features/course/TopicList';
import { AssignmentList } from '@/components/features/course/AssignmentList';
import { CourseSkeleton } from '@/components/skeletons/CourseSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { NotFoundState } from '@/components/NotFoundState';
import { PRICING } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query'; // ✅ For refreshing data

// Lazy Load Modals
const CreateAssignmentModal = dynamic(() => import('@/components/features/course/modals/CreateAssignmentModal'));

// Helper hook for modal accessibility
function useModalAccessibility(isOpen: boolean, onClose: () => void) {
  const ref = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
          if (ref.current) ref.current.focus();
          else if (areaRef.current) areaRef.current.focus();
      }, 100);
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return { inputRef: ref, areaRef };
}

export default function EnhancedCoursePage() {
  const params = useParams();
  const courseId = params?.id as string;
  const router = useRouter();
  const queryClient = useQueryClient(); // ✅ For refetching
  
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isCourseRep, setIsCourseRep] = useState(false);
  
  // React Query Hooks
  const { data: course, isLoading: loadingCourse, error: courseError } = useCourse(courseId);
  const { data: materials, isLoading: loadingMaterials } = useCourseMaterials(courseId);
  const { data: topics = [], isLoading: loadingTopics } = useCourseTopics(courseId);
  
  // Conditional hooks logic
  const isStudentView = role === 'student' && course?.classes?.lecturer_id !== userId;
  const { data: assignments = [], isLoading: loadingAssignments } = useCourseAssignments(
    courseId, 
    userId || undefined, 
    isStudentView
  );
  const { data: announcements = [] } = useCourseAnnouncements(course?.class_id);

  // Local State
  const [hasAccess, setHasAccess] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'assignments'>('content');
  
  const [showModal, setShowModal] = useState<'topic' | 'quiz' | 'manual' | 'announce' | 'assignment' | 'submissions' | 'result_slip' | 'review_grading' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [submissionsList, setSubmissionsList] = useState<AssignmentSubmission[]>([]);
  const [mySubmission, setMySubmission] = useState<AssignmentSubmission | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [topicForm, setTopicForm] = useState({ week_number: 1, title: '', description: '', start_page: 1, end_page: 1 });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' });
  const [quizConfig, setQuizConfig] = useState({ topic: '', difficulty: 'Medium', numQuestions: 5, type: 'Multiple Choice' });
  const [manualQuestionsForm, setManualQuestionsForm] = useState({ questions: '', action: 'convert', file: null as File | null });
  const [assignForm, setAssignForm] = useState({ title: '', description: '', total_points: 100, due_date: '' });
  const [gradeOverride, setGradeOverride] = useState<{ score: number | string, feedback: string }>({ score: 0, feedback: '' });

  // Accessibility Hooks
  const topicModalRefs = useModalAccessibility(showModal === 'topic', () => setShowModal(null));
  const announceModalRefs = useModalAccessibility(showModal === 'announce', () => setShowModal(null));
  const quizModalRefs = useModalAccessibility(showModal === 'quiz', () => setShowModal(null));
  const manualModalRefs = useModalAccessibility(showModal === 'manual', () => setShowModal(null));

  // Auth Check
  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      setUserId(user.id);
      const { data: profile } = await supabase.from('users').select('role, is_course_rep').eq('id', user.id).single();
      setRole(profile?.role);
      setIsCourseRep(profile?.is_course_rep || false);
      
      if (profile?.role === 'student') {
        const { data: access } = await supabase.from('student_course_access').select('id').eq('student_id', user.id).eq('course_id', courseId).maybeSingle();
        setHasAccess(!!access);
      } else {
        setHasAccess(true);
      }
    };
    initAuth();
  }, [router, courseId]);

  // --- HANDLERS ---

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    queryClient.invalidateQueries({ queryKey: ['course-materials', courseId] });
    queryClient.invalidateQueries({ queryKey: ['course-topics', courseId] });
    queryClient.invalidateQueries({ queryKey: ['course-assignments', courseId] });
  };

  const handlePayment = async (amount: number, type: 'single' | 'bundle') => {
      if(confirm(`Simulate Payment of ₵${amount}?`)) {
          const { error } = await supabase.from('student_course_access').insert({ 
            student_id: userId, 
            course_id: courseId, 
            access_type: type === 'bundle' ? 'full_semester' : 'trial' 
          });
          
          if (error) toast.error("Error: " + error.message); 
          else { 
            toast.success("Unlocked Successfully!"); 
            setHasAccess(true); 
            setShowPaywall(false); 
          }
      }
  };

  const handleAssignmentSubmission = async (e: React.ChangeEvent<HTMLInputElement>, assignId: string, title: string, desc: string, maxPoints: number) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const result = await AssignmentService.submit(assignId, user.id, e.target.files[0], { title, description: desc, maxPoints });
      toast.success(`Submitted! AI Grade: ${result.score}/${maxPoints}`);
      refreshData();
    } catch (error: any) { toast.error(error.message); } finally { setUploading(false); }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault(); setProcessing(true);
    try { 
      await AssignmentService.create(courseId, assignForm); 
      toast.success("Assignment Created!"); 
      setShowModal(null); 
      refreshData(); 
    } catch (error: any) { toast.error(error.message); } finally { setProcessing(false); }
  };

  const handleUploadMainHandout = async (e: React.ChangeEvent<HTMLInputElement>) => { 
      if (!e.target.files?.[0]) return; 
      setUploading(true); 
      try { 
          // ✅ USES PDF UTILS
          const text = await extractTextFromPDF(e.target.files[0]); 
          const path = `${courseId}/handout_${Date.now()}`; 
          await supabase.storage.from('course-content').upload(path, e.target.files[0]); 
          const { data: { publicUrl } } = supabase.storage.from('course-content').getPublicUrl(path); 
          
          // Delete old if exists
          if (materials?.mainHandout) await supabase.from('materials').delete().eq('id', materials.mainHandout.id); 
          
          await supabase.from('materials').insert([{ 
             course_id: courseId, 
             title: e.target.files[0].name, 
             file_url: publicUrl, 
             file_type: 'application/pdf', 
             is_main_handout: true, 
             content_text: text 
          }]); 
          
          toast.success('Main Handout Uploaded!'); 
          refreshData(); 
      } catch (e: any) { 
          toast.error(e.message); 
      } finally { setUploading(false); } 
  };

  const handleUploadSupplementary = async (e: React.ChangeEvent<HTMLInputElement>) => { 
    if (!e.target.files?.[0]) return; 
    setUploading(true); 
    try { 
        const path = `${courseId}/supp_${Date.now()}`; 
        await supabase.storage.from('course-content').upload(path, e.target.files[0]); 
        const { data: { publicUrl } } = supabase.storage.from('course-content').getPublicUrl(path); 
        await supabase.from('supplementary_materials').insert([{ 
            course_id: courseId, 
            title: e.target.files[0].name, 
            file_url: publicUrl, 
            file_type: 'application/pdf' 
        }]); 
        toast.success('Material Uploaded!'); 
        refreshData(); 
    } catch (e: any) { 
        toast.error(e.message); 
    } finally { setUploading(false); } 
  };

  const handleManualQuestions = async (e: React.FormEvent) => {
    e.preventDefault(); setProcessing(true);
    try {
      let content = manualQuestionsForm.questions;
      // ✅ USES PDF UTILS
      if (manualQuestionsForm.file) content = await extractTextFromPDF(manualQuestionsForm.file);
      
      const res = await fetch('/api/process-manual-questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questions: content, action: manualQuestionsForm.action, topicId: selectedItem.id }) });
      const { quiz } = await res.json();
      const { data: quizRecord } = await supabase.from('quizzes').insert([{ course_id: courseId, topic_id: selectedItem.id, title: `Quiz: ${selectedItem.title} (Manual)`, topic: selectedItem.title }]).select().single();
      const questions = quiz.map((q: any) => ({ quiz_id: quizRecord.id, question_text: q.question, options: q.options, correct_answer: q.correct_answer, explanation: q.explanation }));
      await supabase.from('questions').insert(questions);
      toast.success("Manual Quiz Created!"); 
      setShowModal(null); 
      refreshData();
    } catch (error: any) { toast.error(error.message); } finally { setProcessing(false); }
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault(); setProcessing(true);
    try {
      const res = await fetch('/api/generate-quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentText: materials?.mainHandout?.content_text || "Text", ...quizConfig }) });
      const { quiz } = await res.json();
      const { data: quizRecord } = await supabase.from('quizzes').insert([{ course_id: courseId, topic_id: selectedItem.id, title: `Quiz: ${quizConfig.topic}`, topic: quizConfig.topic }]).select().single();
      const questions = quiz.map((q: any) => ({ quiz_id: quizRecord.id, question_text: q.question, options: q.options, correct_answer: q.correct_answer, explanation: q.explanation }));
      await supabase.from('questions').insert(questions);
      toast.success("Quiz Generated Successfully!"); 
      setShowModal(null); 
      refreshData();
    } catch (error: any) { toast.error(error.message); } finally { setProcessing(false); }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault(); 
    const { error } = await supabase.from('course_topics').insert([{ course_id: courseId, ...topicForm }]);
    if (error) toast.error(error.message); else { toast.success("Topic Added!"); setShowModal(null); refreshData(); }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault(); const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('class_announcements').insert([{ class_id: course?.class_id, lecturer_id: user?.id, ...announcementForm }]);
    if (error) toast.error(error.message); else { toast.success("Announcement Sent!"); setShowModal(null); refreshData(); }
  };

  const handleDeleteQuiz = async (quizId: string) => { 
      if(!confirm("Delete?")) return; 
      // ✅ USES COURSE SERVICE
      await CourseService.deleteQuiz(quizId); 
      toast.success("Quiz Deleted");
      refreshData(); 
  };
  
  const handleDeleteAssignment = async (id: string) => { 
      if(!confirm("Delete?")) return; 
      // ✅ USES ASSIGNMENT SERVICE
      await AssignmentService.delete(id); 
      toast.success("Assignment Deleted");
      refreshData(); 
  };
  
  // View Helpers
  const handleViewSubmissions = async (assignId: string, title: string) => { setUploading(true); setSelectedItem({ title }); const subs = await AssignmentService.getSubmissions(assignId); setSubmissionsList(subs); setShowModal('submissions'); setUploading(false); };
  const handleSaveGrade = async () => { if (!selectedSubmission) return; await AssignmentService.updateGrade(selectedSubmission.id, Number(gradeOverride.score), gradeOverride.feedback || ""); toast.success("Grade Saved!"); setShowModal('submissions'); const subs = await AssignmentService.getSubmissions(selectedSubmission.assignment_id); setSubmissionsList(subs); };
  const handleViewMyResult = (sub: any, title: string) => { setMySubmission(sub); setSelectedItem({ title }); setShowModal('result_slip'); };
  const openReviewModal = (sub: any) => { setSelectedSubmission(sub); setGradeOverride({ score: sub.lecturer_grade ?? sub.ai_grade, feedback: sub.lecturer_feedback || "" }); setShowModal('review_grading'); };
  
  if (loadingCourse || loadingMaterials || !userId) return <CourseSkeleton />;
  if (courseError) return <ErrorState message="Failed to load course data" onRetry={() => window.location.reload()} />;
  if (!course) return <NotFoundState title="Course Not Found" message="This course doesn't exist or you don't have access." />;
  
  const isPaywalledCourse = course?.classes?.users?.plan_tier === 'cohort_manager';
  const canEdit = role === 'lecturer' || (role === 'student' && isCourseRep && course?.classes?.lecturer_id === userId);
  const canViewAnalysis = canEdit;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => router.back()} className="mb-6 text-sm font-bold text-slate-400 hover:text-slate-900 transition flex items-center gap-1">← Back</button>
        
        <CourseHeader 
          course={course}
          isPaywalledAndLocked={isPaywalledCourse && !hasAccess}
          canEdit={canEdit}
          isCourseRep={isCourseRep}
          onInvite={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link Copied!"); }}
          onAddWeek={() => setShowModal('topic')}
          onAnnounce={() => setShowModal('announce')}
        />

        <div className="flex gap-4 border-b border-slate-200 mb-8 pb-1 overflow-x-auto" role="tablist">
          <button role="tab" aria-selected={activeTab === 'content'} onClick={() => setActiveTab('content')} className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-all ${activeTab === 'content' ? 'text-blue-600 bg-white border-x border-t border-slate-200 -mb-px' : 'text-slate-500 hover:text-slate-800'}`}>Course Content</button>
          <button role="tab" aria-selected={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')} className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-all ${activeTab === 'assignments' ? 'text-blue-600 bg-white border-x border-t border-slate-200 -mb-px' : 'text-slate-500 hover:text-slate-800'}`}>Assignments & Grades</button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
             {activeTab === 'content' ? (
                <>
                  <CourseMaterials 
                    mainHandout={materials?.mainHandout || null}
                    supplementaryMaterials={materials?.supplementary || []}
                    canEdit={canEdit}
                    isCourseRep={isCourseRep}
                    uploading={uploading}
                    onUploadMain={handleUploadMainHandout} 
                    onUploadSupp={handleUploadSupplementary}
                  />
                  <div className="mt-8">
                      <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><span className="text-purple-500 bg-purple-50 p-1.5 rounded-lg text-lg">📅</span> Weekly Schedule</h2>
                      <TopicList 
                        topics={topics}
                        isLocked={isPaywalledCourse && !hasAccess}
                        mainHandoutId={materials?.mainHandout?.id || null}
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
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* Paywall Modal */}
      {showPaywall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300" role="dialog" aria-modal="true">
              <div className="bg-white rounded-3xl p-8 w-full max-w-md text-center shadow-2xl">
                  <div className="text-5xl mb-4">🔓</div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Unlock Course</h2>
                  <p className="text-slate-500 mb-6">Get access to all weekly notes and quizzes.</p>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                      <button onClick={() => handlePayment(PRICING.SINGLE_COURSE, 'single')} className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 hover:border-blue-500 transition">
                        <p className="text-xs font-bold text-slate-400 uppercase">This Course</p>
                        <p className="text-2xl font-bold text-blue-600">₵{PRICING.SINGLE_COURSE}</p>
                      </button>
                      <button onClick={() => handlePayment(PRICING.SEMESTER_BUNDLE, 'bundle')} className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 hover:border-purple-500 transition">
                        <p className="text-xs font-bold text-slate-400 uppercase">Bundle</p>
                        <p className="text-2xl font-bold text-purple-600">₵{PRICING.SEMESTER_BUNDLE}</p>
                      </button>
                  </div>
                  <button onClick={() => setShowPaywall(false)} className="text-slate-400 font-bold hover:text-slate-600 text-sm">Maybe later</button>
              </div>
          </div>
      )}

      {/* Topic Modal */}
      {showModal === 'topic' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-bold mb-4 text-slate-900">Add Topic</h3>
                <form onSubmit={handleAddTopic} className="space-y-4">
                    <input ref={topicModalRefs.inputRef} type="number" placeholder="Week #" value={topicForm.week_number} onChange={e => setTopicForm({...topicForm, week_number: parseInt(e.target.value)})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
                    <input placeholder="Title" value={topicForm.title} onChange={e => setTopicForm({...topicForm, title: e.target.value})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" required />
                    <textarea placeholder="Description" value={topicForm.description} onChange={e => setTopicForm({...topicForm, description: e.target.value})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 h-24 outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Start Page" value={topicForm.start_page} onChange={e => setTopicForm({...topicForm, start_page: parseInt(e.target.value)})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 outline-none" />
                        <input type="number" placeholder="End Page" value={topicForm.end_page} onChange={e => setTopicForm({...topicForm, end_page: parseInt(e.target.value)})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 outline-none" />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setShowModal(null)} className="flex-1">Cancel</Button>
                        <Button type="submit" className="flex-1">Add Topic</Button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Lazy Loaded Assignment Modal */}
      {showModal === 'assignment' && (
        <CreateAssignmentModal 
           onClose={() => setShowModal(null)}
           onSubmit={handleCreateAssignment}
           processing={processing}
           data={assignForm}
           onChange={setAssignForm}
        />
      )}

      {/* Announcement Modal */}
      {showModal === 'announce' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="announce-title">
             <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
               <h3 id="announce-title" className="text-xl font-bold mb-4 text-slate-900">Announcement</h3>
               <form onSubmit={handleSendAnnouncement} className="space-y-4">
                 <input ref={announceModalRefs.inputRef} placeholder="Title" value={announcementForm.title} onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" required />
                 <textarea placeholder="Message" value={announcementForm.message} onChange={e => setAnnouncementForm({...announcementForm, message: e.target.value})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 h-24 outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                 <div className="flex gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setShowModal(null)} className="flex-1">Cancel</Button><Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">Send</Button></div>
               </form>
             </div>
        </div>
      )}

      {/* Manual Questions Modal */}
      {showModal === 'manual' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
                <h3 className="text-xl font-bold mb-4 text-slate-900">Manual Quiz Creator</h3>
                <textarea ref={manualModalRefs.areaRef} value={manualQuestionsForm.questions} onChange={e => setManualQuestionsForm({...manualQuestionsForm, questions: e.target.value})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 h-40 font-mono text-sm outline-none mb-4" placeholder="Type questions here..." />
                <input type="file" accept=".txt,.doc,.docx,.pdf" onChange={e => setManualQuestionsForm({...manualQuestionsForm, file: e.target.files?.[0] || null})} className="block w-full text-sm text-slate-500 mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"/>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <button onClick={() => setManualQuestionsForm({...manualQuestionsForm, action: 'convert'})} type="button" className={`p-2 border rounded-lg text-sm ${manualQuestionsForm.action==='convert' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'text-gray-600'}`}>📝 Convert Only</button>
                    <button onClick={() => setManualQuestionsForm({...manualQuestionsForm, action: 'enhance'})} type="button" className={`p-2 border rounded-lg text-sm ${manualQuestionsForm.action==='enhance' ? 'bg-green-50 border-green-500 text-green-700' : 'text-gray-600'}`}>✨ AI Enhance</button>
                </div>
                <div className="flex gap-2 mt-4"><Button type="button" variant="secondary" onClick={() => setShowModal(null)} className="flex-1">Cancel</Button><Button onClick={handleManualQuestions} disabled={processing} className="flex-1 bg-slate-900 text-white">{processing ? 'Processing...' : 'Process'}</Button></div>
            </div>
        </div>
      )}

      {/* Quiz Config Modal */}
      {showModal === 'quiz' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-4 text-orange-600">AI Quiz Generator</h3>
              <form onSubmit={handleGenerateQuiz} className="space-y-4">
                <input ref={quizModalRefs.inputRef} placeholder="Topic" value={quizConfig.topic} onChange={e => setQuizConfig({...quizConfig, topic: e.target.value})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-orange-500" required />
                <div className="grid grid-cols-2 gap-2">
                  <select value={quizConfig.difficulty} onChange={e => setQuizConfig({...quizConfig, difficulty: e.target.value})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 outline-none"><option>Easy</option><option>Medium</option><option>Hard</option></select>
                  <select value={quizConfig.numQuestions} onChange={e => setQuizConfig({...quizConfig, numQuestions: parseInt(e.target.value)})} className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 outline-none"><option value={3}>3 Questions</option><option value={5}>5 Questions</option><option value={10}>10 Questions</option></select>
                </div>
                <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => setShowModal(null)} className="flex-1">Cancel</Button><Button type="submit" disabled={processing} className="flex-1 bg-orange-600 hover:bg-orange-700">{processing ? 'Generating...' : 'Generate'}</Button></div>
              </form>
            </div>
          </div>
      )}

    </div>
  );
}
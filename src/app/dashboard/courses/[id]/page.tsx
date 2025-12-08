'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';
import { FocusTrap } from 'focus-trap-react';
import { toast } from 'sonner';
import { 
  Sparkles, Loader2, Lock, FileUp, Plus 
} from 'lucide-react';

// --- Internal Imports ---
import { supabase } from '@/lib/supabase'; // Adjusted to alias for cleaner import
import { extractTextFromPDF, extractDataFromPDF } from '@/lib/utils/pdf-utils';
import { AssignmentService } from '@/lib/services/assignment.service';
import { CourseService } from '@/lib/services/course.service';
import { AssignmentSubmission } from '@/types';

// --- Hooks ---
import { 
  useCourse, 
  useCourseMaterials, 
  useCourseTopics, 
  useCourseAssignments, 
} from '@/hooks/useCourse';

// --- Components ---
import { CourseHeader } from '@/components/features/course/CourseHeader';
import { CourseMaterials } from '@/components/features/course/CourseMaterials';
import { TopicList } from '@/components/features/course/TopicList';
import { AssignmentList } from '@/components/features/course/AssignmentList';
import { CourseSkeleton } from '@/components/skeletons/CourseSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { NotFoundState } from '@/components/NotFoundState';
import { Button } from '@/components/ui/Button';
import { CoursePaywallModal } from '@/components/features/student/CoursePaywallModal';

// Dynamic Load for Heavy Modal
const CreateAssignmentModal = dynamic(() => import('@/components/features/course/modals/CreateAssignmentModal'));

export default function EnhancedCoursePage() {
  const params = useParams();
  const courseId = params?.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // --- 👤 User State ---
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isCourseRep, setIsCourseRep] = useState(false);
  
  // --- 📡 Data Hooks ---
  const { data: course, isLoading: loadingCourse, error: courseError } = useCourse(courseId);
  const { data: materials, isLoading: loadingMaterials } = useCourseMaterials(courseId);
  const { data: topics = [], isLoading: loadingTopics } = useCourseTopics(courseId);
  
  // Determine View Mode
  const isStudentView = role === 'student' && course?.classes?.lecturer_id !== userId;
  const { data: assignments = [] } = useCourseAssignments(courseId, userId || undefined, isStudentView);

  // --- 🔒 Access Control State ---
  const [hasCourseAccess, setHasCourseAccess] = useState(false); // Can view content (Wk 3+)
  const [hasBundleAccess, setHasBundleAccess] = useState(false); // Can use AI Solver
  const [showPaywall, setShowPaywall] = useState(false);
  
  // --- ⚙️ UI State ---
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [locatingPages, setLocatingPages] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'assignments'>('content');
  
  // --- 🖼️ Modal State ---
  const [showModal, setShowModal] = useState<'topic' | 'quiz' | 'manual' | 'announce' | 'assignment' | 'submissions' | 'result_slip' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [submissionsList, setSubmissionsList] = useState<AssignmentSubmission[]>([]);
  const [mySubmission, setMySubmission] = useState<AssignmentSubmission | null>(null);
  
  // --- 📝 Form State ---
  const [topicForm, setTopicForm] = useState({ week_number: 1, title: '', description: '', start_page: 1, end_page: 1 });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' });
  const [quizConfig, setQuizConfig] = useState({ topic: '', difficulty: 'Medium', numQuestions: 5, type: 'Multiple Choice' });
  const [manualQuestionsForm, setManualQuestionsForm] = useState({ questions: '', action: 'convert', file: null as File | null });
  const [assignForm, setAssignForm] = useState({ title: '', description: '', total_points: 100, due_date: '' });

  // 1. Auth & Permissions Check
  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      setUserId(user.id);
      
      const { data: profile } = await supabase.from('users').select('role, is_course_rep').eq('id', user.id).single();
      setRole(profile?.role);
      setIsCourseRep(profile?.is_course_rep || false);
      
      // 🛡️ SECURITY: Check Access Level
      if (profile?.role === 'student' && !profile?.is_course_rep && course?.class_id) {
        const now = new Date().toISOString();
        const { data: access } = await supabase
          .from('student_course_access')
          .select('access_type')
          .eq('student_id', user.id)
          .or(`course_id.eq.${courseId},class_id.eq.${course.class_id}`)
          .gt('expires_at', now) // Active only
          .maybeSingle();

        if (access) {
          setHasCourseAccess(true);
          if (access.access_type === 'semester_bundle') {
            setHasBundleAccess(true);
          }
        }
      } else {
        // Lecturers and Course Reps have Super Admin privileges for this course
        setHasCourseAccess(true);
        setHasBundleAccess(true);
      }
    };
    
    if (course) initAuth();
  }, [router, courseId, course]);

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    queryClient.invalidateQueries({ queryKey: ['course-materials', courseId] });
    queryClient.invalidateQueries({ queryKey: ['course-topics', courseId] });
    queryClient.invalidateQueries({ queryKey: ['course-assignments', courseId] });
  };

  // --- 🛠️ HANDLERS ---

  // 1. Upload Main Handout (With Archiving Logic)
  const handleUploadMainHandout = async (e: React.ChangeEvent<HTMLInputElement>) => { 
      if (!e.target.files?.[0]) return; 
      setUploading(true); 
      try { 
          const text = await extractTextFromPDF(e.target.files[0]); 
          const path = `${courseId}/handout_${Date.now()}`; 
          
          await supabase.storage.from('course-content').upload(path, e.target.files[0]); 
          const { data: { publicUrl } } = supabase.storage.from('course-content').getPublicUrl(path); 
          
          // Safe Delete old handout (Archives connected topics)
          if (materials?.mainHandout) {
             await CourseService.deleteMainHandout(materials.mainHandout.id);
          }
          
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

  // 2. Syllabus Auto-Generate (AI Agent)
  const handleSyllabusUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setProcessing(true);
    const toastId = toast.loading("Analyzing Syllabus... This may take a moment.");
    
    try {
        const file = e.target.files[0];
        const syllabusText = await extractTextFromPDF(file);
        let mainHandoutTocText = "";

        // Fetch Main Handout TOC for better page mapping if available
        if (materials?.mainHandout?.file_url) {
            try {
                const response = await fetch(materials.mainHandout.file_url);
                const blob = await response.blob();
                const mainFile = new File([blob], "handout.pdf");
                const text = await extractTextFromPDF(mainFile); 
                mainHandoutTocText = text.slice(0, 50000); // Limit context
            } catch (err) {
                console.warn("Could not read main handout for cross-referencing");
            }
        }
        
        const res = await fetch('/api/generate-syllabus', {
            method: 'POST',
            body: JSON.stringify({ 
                syllabusText, 
                mainHandoutTocText, 
                courseId 
            })
        });
        
        if (!res.ok) throw new Error("Failed to generate");
        
        const data = await res.json();
        toast.success(`Generated ${data.count} weekly topics!`, { id: toastId });
        refreshData();
        
    } catch (e: any) {
        toast.error("Error parsing syllabus", { id: toastId });
    } finally {
        setProcessing(false);
    }
  };

  // 3. Auto-Locate Pages (Manual Topic Helper)
  const handleAutoLocate = async () => {
    if (!topicForm.title) return toast.error("Enter topic title first.");
    if (!materials?.mainHandout) return toast.error("No Main Handout.");
    setLocatingPages(true);
    try {
      const response = await fetch(materials.mainHandout.file_url);
      const blob = await response.blob();
      const file = new File([blob], "handout.pdf");
      const { pages } = await extractDataFromPDF(file);
      const tocText = pages.slice(0, 20).map(p => `[Page ${p.pageNumber}] ${p.text}`).join("\n");
      
      const apiRes = await fetch('/api/find-page-range', { 
        method: 'POST', 
        body: JSON.stringify({ topicTitle: topicForm.title, tocContext: tocText }) 
      });
      
      const data = await apiRes.json();
      if (data.start_page > 0) {
        setTopicForm(prev => ({ ...prev, start_page: data.start_page, end_page: data.end_page }));
        toast.success(`Found: Pg ${data.start_page}-${data.end_page}`);
      } else { toast.warning("Topic not found in TOC."); }
    } catch (e) { toast.error("Auto-locate failed."); } finally { setLocatingPages(false); }
  };

  // 4. Create Topic (Manual)
  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault(); 
    const { error } = await supabase.from('course_topics').insert([{ 
        course_id: courseId, 
        material_id: materials?.mainHandout?.id, 
        ...topicForm 
    }]);
    if (error) toast.error(error.message); else { toast.success("Topic Added!"); setShowModal(null); refreshData(); }
  };

  // 5. Assignment Creation (With Rubric Support)
  const handleCreateAssignment = async (e: React.FormEvent, extendedData?: any) => {
    e.preventDefault(); 
    setProcessing(true);
    const payload = extendedData || assignForm; // Support rubric data
    try { 
        await AssignmentService.create(courseId, payload); 
        toast.success("Assignment Created!"); 
        setShowModal(null); 
        refreshData(); 
    } catch (error: any) { 
        toast.error(error.message); 
    } finally { 
        setProcessing(false); 
    }
  };

  // Other Handlers
  const handleUploadSupplementary = async (e: React.ChangeEvent<HTMLInputElement>) => { 
    if (!e.target.files?.[0]) return; 
    setUploading(true); 
    try { 
        const path = `${courseId}/supp_${Date.now()}`; 
        await supabase.storage.from('course-content').upload(path, e.target.files[0]); 
        const { data: { publicUrl } } = supabase.storage.from('course-content').getPublicUrl(path); 
        await supabase.from('supplementary_materials').insert([{ course_id: courseId, title: e.target.files[0].name, file_url: publicUrl, file_type: 'application/pdf' }]); 
        toast.success('Material Uploaded!'); refreshData(); 
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); } 
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

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!course?.class_id) throw new Error("Class link error");
        await supabase.from('class_announcements').insert([{ class_id: course.class_id, lecturer_id: user?.id, ...announcementForm }]);
        toast.success("Sent!"); setShowModal(null);
    } catch(e: any) { toast.error(e.message); }
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault(); setProcessing(true);
    try {
      const res = await fetch('/api/generate-quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentText: materials?.mainHandout?.content_text || "Text", ...quizConfig }) });
      const { quiz } = await res.json();
      const { data: quizRecord } = await supabase.from('quizzes').insert([{ course_id: courseId, topic_id: selectedItem?.id, title: `Quiz: ${quizConfig.topic}`, topic: quizConfig.topic }]).select().single();
      const questions = quiz.map((q: any) => ({ quiz_id: quizRecord.id, question_text: q.question, options: q.options, correct_answer: q.correct_answer, explanation: q.explanation }));
      await supabase.from('questions').insert(questions);
      toast.success("Quiz Generated!"); setShowModal(null); refreshData();
    } catch (e: any) { toast.error(e.message); } finally { setProcessing(false); }
  };

  const handleManualQuestions = async (e: React.FormEvent) => {
    e.preventDefault(); setProcessing(true);
    try {
      let content = manualQuestionsForm.questions;
      if (manualQuestionsForm.file) content = await extractTextFromPDF(manualQuestionsForm.file);
      const res = await fetch('/api/process-manual-questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questions: content, action: manualQuestionsForm.action, topicId: selectedItem.id }) });
      const { quiz } = await res.json();
      const { data: quizRecord } = await supabase.from('quizzes').insert([{ course_id: courseId, topic_id: selectedItem.id, title: `Quiz: ${selectedItem.title}`, topic: selectedItem.title }]).select().single();
      const questions = quiz.map((q: any) => ({ quiz_id: quizRecord.id, question_text: q.question, options: q.options, correct_answer: q.correct_answer, explanation: q.explanation }));
      await supabase.from('questions').insert(questions);
      toast.success("Manual Quiz Created!"); setShowModal(null); refreshData();
    } catch (e: any) { toast.error(e.message); } finally { setProcessing(false); }
  };

  const handleDeleteQuiz = async (id: string) => { if(confirm("Delete?")) { await CourseService.deleteQuiz(id); toast.success("Deleted"); refreshData(); }};
  const handleDeleteAssignment = async (id: string) => { if(confirm("Delete?")) { await AssignmentService.delete(id); toast.success("Deleted"); refreshData(); }};
  const handleViewSubmissions = async (assignId: string, title: string) => { setUploading(true); setSelectedItem({ title }); const subs = await AssignmentService.getSubmissions(assignId); setSubmissionsList(subs); setShowModal('submissions'); setUploading(false); };
  const handleViewMyResult = (sub: any, title: string) => { setMySubmission(sub); setSelectedItem({ title }); setShowModal('result_slip'); };

  // --- Rendering ---
  if (loadingCourse || loadingMaterials || !userId) return <CourseSkeleton />;
  if (courseError) return <ErrorState message="Failed to load course" onRetry={() => window.location.reload()} />;
  if (!course) return <NotFoundState title="Course Not Found" message="Access denied or course missing." />;
  
  const canEdit = role === 'lecturer' || isCourseRep;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => router.back()} className="mb-6 text-sm font-bold text-slate-400 hover:text-slate-900 transition flex items-center gap-1">← Back</button>
        
        <CourseHeader 
          course={course}
          isPaywalledAndLocked={!hasCourseAccess && !canEdit}
          canEdit={canEdit}
          isCourseRep={isCourseRep}
          onInvite={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link Copied!"); }}
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
                    mainHandout={materials?.mainHandout || null}
                    supplementaryMaterials={materials?.supplementary || []}
                    hasBundleAccess={hasBundleAccess || canEdit} 
                    onUnlockBundle={() => setShowPaywall(true)}
                    canEdit={canEdit}
                    isCourseRep={isCourseRep}
                    uploading={uploading}
                    onUploadMain={handleUploadMainHandout} 
                    onUploadSupp={handleUploadSupplementary}
                  />
                  
                  <div className="mt-8">
                      {/* Topic List Header with Syllabus Generator */}
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                           <span className="text-purple-500 bg-purple-50 p-1.5 rounded-lg text-lg">📅</span> Weekly Schedule
                        </h2>
                        
                        {!hasCourseAccess && !canEdit && (
                          <div className="flex items-center gap-1.5 text-xs text-orange-600 font-bold bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                             <Lock className="w-3 h-3" /> Weeks 1-2 Free
                          </div>
                        )}

                        {/* MAGIC BUTTON FOR LECTURERS */}
                        {canEdit && (
                           <div className="flex gap-2">
                               <label className="cursor-pointer flex items-center gap-2 bg-linear-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:shadow-lg transition">
                                   {processing ? <Loader2 className="w-3 h-3 animate-spin"/> : <FileUp className="w-3 h-3" />}
                                   Auto-Generate
                                   <input type="file" accept=".pdf" onChange={handleSyllabusUpload} className="hidden" disabled={processing} />
                               </label>
                               <Button onClick={() => setShowModal('topic')} variant="outline" size="sm">+ Manual</Button>
                           </div>
                        )}
                      </div>
                      
                      <TopicList 
                        topics={topics}
                        isLocked={!hasCourseAccess} // Logic handled inside TopicList to allow Weeks 1 & 2
                        mainHandoutId={materials?.mainHandout?.id || null}
                        canViewAnalysis={canEdit}
                        canEdit={canEdit}
                        isCourseRep={isCourseRep}
                        courseName={course.title}
                        courseId={course.id}
                        classId={course.class_id}
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

      {showPaywall && (
          <CoursePaywallModal 
             courseName={course.title}
             courseId={course.id}
             classId={course.class_id}
             onClose={() => setShowPaywall(false)}
          />
      )}

      {/* --- MODALS --- */}
      {showModal === 'assignment' && (
        <CreateAssignmentModal 
          onClose={() => setShowModal(null)} 
          // ✅ FIX: Wrapper to handle extendedData from RubricBuilder
          onSubmit={(e, extendedData) => handleCreateAssignment(e, extendedData)} 
          processing={processing} 
          data={assignForm} 
          onChange={setAssignForm} 
        />
      )}

      {/* ANNOUNCEMENT MODAL */}
      {showModal === 'announce' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
            <FocusTrap focusTrapOptions={{ initialFocus: '#announce-input', onDeactivate: () => setShowModal(null), clickOutsideDeactivates: true }}>
                <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
                    <h3 className="text-lg font-bold mb-4">Post Announcement</h3>
                    <form onSubmit={handleSendAnnouncement} className="space-y-4">
                        <input 
                           id="announce-input"
                           className="w-full p-3 border rounded-xl font-bold" 
                           placeholder="Title" 
                           value={announcementForm.title} 
                           onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} 
                        />
                        <textarea 
                           className="w-full p-3 border rounded-xl h-24 resize-none" 
                           placeholder="Message..." 
                           value={announcementForm.message} 
                           onChange={e => setAnnouncementForm({...announcementForm, message: e.target.value})} 
                        />
                        <div className="flex gap-2">
                           <Button variant="secondary" onClick={() => setShowModal(null)} className="flex-1">Cancel</Button>
                           <Button type="submit" disabled={processing} className="flex-1">Send</Button>
                        </div>
                    </form>
                </div>
            </FocusTrap>
        </div>
      )}

      {/* QUIZ MODAL (AI) */}
      {showModal === 'quiz' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
             <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
                 <h3 className="text-lg font-bold mb-4 text-indigo-600">Generate AI Quiz</h3>
                 <div className="space-y-4">
                    <input 
                       className="w-full p-3 border rounded-xl" 
                       placeholder="Topic Focus (e.g. Photosynthesis)" 
                       value={quizConfig.topic} 
                       onChange={e => setQuizConfig({...quizConfig, topic: e.target.value})} 
                    />
                    <div className="grid grid-cols-2 gap-2">
                       <select className="p-3 border rounded-xl" value={quizConfig.difficulty} onChange={e => setQuizConfig({...quizConfig, difficulty: e.target.value})}>
                          <option>Easy</option><option>Medium</option><option>Hard</option>
                       </select>
                       <select className="p-3 border rounded-xl" value={quizConfig.numQuestions} onChange={e => setQuizConfig({...quizConfig, numQuestions: parseInt(e.target.value)})}>
                          <option value="3">3 Questions</option><option value="5">5 Questions</option><option value="10">10 Questions</option>
                       </select>
                    </div>
                    <Button onClick={handleGenerateQuiz} disabled={processing} className="w-full bg-indigo-600 text-white">
                       {processing ? 'Generating...' : 'Create Quiz'}
                    </Button>
                    <Button onClick={() => setShowModal(null)} variant="secondary" className="w-full">Cancel</Button>
                 </div>
             </div>
        </div>
      )}

      {/* MANUAL QUIZ MODAL */}
      {showModal === 'manual' && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
             <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl">
                 <h3 className="text-lg font-bold mb-2">Manual Quiz</h3>
                 <p className="text-xs text-slate-500 mb-4">Paste questions text or upload a document.</p>
                 <textarea 
                    className="w-full h-32 p-3 border rounded-xl text-sm font-mono" 
                    placeholder="1. What is...?"
                    value={manualQuestionsForm.questions}
                    onChange={e => setManualQuestionsForm({...manualQuestionsForm, questions: e.target.value})}
                 />
                 <div className="flex gap-2 mt-4">
                     <Button onClick={handleManualQuestions} disabled={processing} className="flex-1">Process</Button>
                     <Button onClick={() => setShowModal(null)} variant="secondary" className="flex-1">Cancel</Button>
                 </div>
             </div>
         </div>
      )}

      {showModal === 'topic' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <FocusTrap focusTrapOptions={{ initialFocus: '#topic-week', onDeactivate: () => setShowModal(null), clickOutsideDeactivates: true }}>
                <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
                    <h3 className="text-xl font-bold mb-4 text-slate-900">Add Weekly Topic</h3>
                    <form onSubmit={handleAddTopic} className="space-y-4">
                        <input id="topic-week" type="number" placeholder="Week #" value={topicForm.week_number} onChange={e => setTopicForm({...topicForm, week_number: parseInt(e.target.value)})} className="w-full bg-slate-50 border-none p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
                        <div className="relative">
                           <input placeholder="Topic Title (e.g. Intro to Cytoplasm)" value={topicForm.title} onChange={e => setTopicForm({...topicForm, title: e.target.value})} className="w-full bg-slate-50 border-none p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 pr-12" required />
                           {materials?.mainHandout && (
                             <button type="button" onClick={handleAutoLocate} disabled={locatingPages || !topicForm.title} className="absolute right-2 top-2 p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-50">
                               {locatingPages ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                             </button>
                           )}
                        </div>
                        <textarea placeholder="Description" value={topicForm.description} onChange={e => setTopicForm({...topicForm, description: e.target.value})} className="w-full bg-slate-50 border-none p-3 rounded-xl h-24 outline-none resize-none" />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="number" placeholder="Start Pg" className="w-full bg-slate-50 border-none p-3 rounded-xl" value={topicForm.start_page} onChange={e => setTopicForm({...topicForm, start_page: parseInt(e.target.value)})} />
                            <input type="number" placeholder="End Pg" className="w-full bg-slate-50 border-none p-3 rounded-xl" value={topicForm.end_page} onChange={e => setTopicForm({...topicForm, end_page: parseInt(e.target.value)})} />
                        </div>
                        <div className="flex gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setShowModal(null)} className="flex-1">Cancel</Button><Button type="submit" className="flex-1">Add Topic</Button></div>
                    </form>
                </div>
            </FocusTrap>
        </div>
      )}
    </div>
  );
}
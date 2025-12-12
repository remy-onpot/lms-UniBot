'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Loader2, FileUp, Sparkles, Lock 
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { extractDataFromPDF } from '@/lib/utils/pdf-utils';
import { CourseService } from '@/lib/services/course.service';
import { AssignmentService } from '@/lib/services/assignment.service';

import { 
  useCourse, 
  useCourseMaterials, 
  useCourseTopics, 
  useCourseAssignments, 
} from '@/hooks/useCourse';

import { CourseHeader } from '@/components/features/course/CourseHeader';
import { CourseMaterials } from '@/components/features/course/CourseMaterials';
import { TopicList } from '@/components/features/course/TopicList';
import { AssignmentList } from '@/components/features/course/AssignmentList';
import { VirtualLab } from '@/components/features/course/VirtualLab';
import { MobileGuard } from '@/components/features/course/MobileGuard';
import { CoursePaywallModal } from '@/components/features/student/CoursePaywallModal';
import { CourseSkeleton } from '@/components/skeletons/CourseSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { NotFoundState } from '@/components/NotFoundState';
import { Button } from '@/components/ui/Button';

// ✅ NEW MODALS IMPORT
import { AnnouncementModal } from '@/components/features/course/modals/AnnouncementModal';
import { UploadResourceModal } from '@/components/features/course/modals/UploadResourceModal';
import { ManualQuizModal } from '@/components/features/course/modals/ManualQuizModal';
import { AIQuizModal } from '@/components/features/course/modals/AIQuizModal';
import CreateAssignmentModal from '@/components/features/course/modals/CreateAssignmentModal';

export default function CoursePage() {
  const params = useParams();
  const courseId = params?.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isCourseRep, setIsCourseRep] = useState(false);
  
  const { data: course, isLoading: loadingCourse, error: courseError } = useCourse(courseId);
  const { data: materials, isLoading: loadingMaterials } = useCourseMaterials(courseId);
  const { data: topics = [], isLoading: loadingTopics } = useCourseTopics(courseId);
  
  const isStudentView = role === 'student' && course?.classes?.lecturer_id !== userId;
  const { data: assignments = [] } = useCourseAssignments(courseId, userId || undefined, isStudentView);

  const [activeTab, setActiveTab] = useState<'content' | 'assignments' | 'lab'>('content');
  const [showPaywall, setShowPaywall] = useState(false);
  const [hasCourseAccess, setHasCourseAccess] = useState(false);
  const [hasBundleAccess, setHasBundleAccess] = useState(false);
  const [processingSyllabus, setProcessingSyllabus] = useState(false);

  // ✅ NEW: Centralized Modal State
  const [activeModal, setActiveModal] = useState<'announce' | 'upload_supp' | 'manual_quiz' | 'ai_quiz' | 'assignment' | 'topic' | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      setUserId(user.id);
      
      const { data: profile } = await supabase.from('users').select('role, is_course_rep').eq('id', user.id).single();
      setRole(profile?.role);
      setIsCourseRep(profile?.is_course_rep || false);
      
      if (profile?.role === 'student' && !profile?.is_course_rep && course?.class_id) {
        const now = new Date().toISOString();
        const { data: access } = await supabase
          .from('student_course_access')
          .select('access_type')
          .eq('student_id', user.id)
          .or(`course_id.eq.${courseId},class_id.eq.${course.class_id}`)
          .gt('expires_at', now)
          .maybeSingle();

        if (access) {
          setHasCourseAccess(true);
          if (access.access_type === 'semester_bundle') setHasBundleAccess(true);
        }
      } else {
        setHasCourseAccess(true);
        setHasBundleAccess(true);
      }
    };
    if (course) initAuth();
  }, [course, courseId, router]);

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    queryClient.invalidateQueries({ queryKey: ['course-materials', courseId] });
    queryClient.invalidateQueries({ queryKey: ['course-topics', courseId] });
    queryClient.invalidateQueries({ queryKey: ['course-assignments', courseId] });
  };

  const handleUploadMainHandout = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const toastId = toast.loading("Uploading Handout...");
    try {
      const { fullText } = await extractDataFromPDF(e.target.files[0]);
      const path = `${courseId}/handout_${Date.now()}`;
      await supabase.storage.from('course-content').upload(path, e.target.files[0]);
      const { data: { publicUrl } } = supabase.storage.from('course-content').getPublicUrl(path);
      
      if (materials?.mainHandout) await CourseService.deleteMainHandout(materials.mainHandout.id);
      
      await supabase.from('materials').insert([{ 
         course_id: courseId, title: e.target.files[0].name, file_url: publicUrl, 
         file_type: 'application/pdf', is_main_handout: true, content_text: fullText 
      }]);
      toast.success("Main Handout Updated!", { id: toastId });
      refreshData();
    } catch (e: any) { toast.error("Upload failed", { id: toastId, description: e.message }); }
  };

  const handleSyllabusUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setProcessingSyllabus(true);
    const toastId = toast.loading("Analyzing Syllabus...");
    
    try {
        const file = e.target.files[0];
        const pdfData = await extractDataFromPDF(file);

        if (pdfData.isScanned) throw new Error("Scanned PDF detected. Please upload a text-based PDF.");
        if (pdfData.fullText.length < 50) throw new Error("File appears empty.");

        let mainHandoutTocText = "";
        if (materials?.mainHandout?.file_url) {
            try {
                const response = await fetch(materials.mainHandout.file_url);
                const blob = await response.blob();
                const mainData = await extractDataFromPDF(new File([blob], "handout.pdf"));
                mainHandoutTocText = mainData.fullText.slice(0, 50000);
            } catch (err) { console.warn("Handout cross-ref failed"); }
        }
        
        const res = await fetch('/api/generate-syllabus', {
            method: 'POST',
            body: JSON.stringify({ syllabusText: pdfData.fullText, mainHandoutTocText, courseId })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");
        
        toast.success(`Generated ${data.count} topics!`, { id: toastId });
        refreshData();
    } catch (e: any) {
        toast.error("Syllabus Error", { id: toastId, description: e.message });
    } finally {
        setProcessingSyllabus(false);
        e.target.value = "";
    }
  };

  if (loadingCourse || loadingMaterials) return <CourseSkeleton />;
  if (courseError) return <ErrorState message="Failed to load course" onRetry={() => window.location.reload()} />;
  if (!course) return <NotFoundState title="Course Not Found" />;
  
  const canEdit = role === 'lecturer' || isCourseRep;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Header */}
        <div>
          <button onClick={() => router.back()} className="text-sm font-bold text-slate-400 hover:text-slate-900 flex items-center gap-1 mb-4 transition-colors">← Back</button>
          <CourseHeader 
            course={course}
            isPaywalledAndLocked={!hasCourseAccess && !canEdit}
            canEdit={canEdit}
            isCourseRep={isCourseRep}
            onInvite={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link Copied!"); }}
            onAddWeek={() => setActiveModal('topic')}
            onAnnounce={() => setActiveModal('announce')}
          />
        </div>

        {/* Navigation */}
        <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 w-fit shadow-sm">
          {['content', 'assignments', 'lab'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} {tab === 'lab' && '🔬'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="grid gap-8 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 space-y-8">
             
             {activeTab === 'content' && (
                <>
                  <CourseMaterials 
                    mainHandout={materials?.mainHandout || null}
                    supplementaryMaterials={materials?.supplementary || []}
                    hasBundleAccess={hasBundleAccess || canEdit} 
                    onUnlockBundle={() => setShowPaywall(true)}
                    canEdit={canEdit}
                    isCourseRep={isCourseRep}
                    uploading={false}
                    onUploadMain={handleUploadMainHandout} 
                    onUploadSupp={() => setActiveModal('upload_supp')} 
                  />
                  
                  <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                           <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><FileUp className="w-5 h-5" /></span>
                           Weekly Schedule
                        </h2>
                        
                        {!hasCourseAccess && !canEdit && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                             <Lock className="w-3 h-3" /> Weeks 1-2 Free
                          </div>
                        )}

                        {canEdit && (
                           <div className="flex items-center gap-2">
                               <label className="cursor-pointer flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:border-indigo-300 hover:text-indigo-600 transition shadow-sm">
                                   {processingSyllabus ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3 text-purple-500" />}
                                   Auto-Generate
                                   <input type="file" accept=".pdf" onChange={handleSyllabusUpload} className="hidden" disabled={processingSyllabus} />
                               </label>
                               <Button onClick={() => setActiveModal('topic')} size="sm" variant="outline">+ Topic</Button>
                           </div>
                        )}
                      </div>
                      
                      <TopicList 
                        topics={topics}
                        isLocked={!hasCourseAccess} 
                        mainHandoutId={materials?.mainHandout?.id || null}
                        mainHandoutUrl={materials?.mainHandout?.file_url}
                        canViewAnalysis={canEdit}
                        canEdit={canEdit}
                        isCourseRep={isCourseRep}
                        courseName={course.title}
                        courseId={course.id}
                        classId={course.class_id}
                        onUnlock={() => setShowPaywall(true)}
                        onDeleteQuiz={async (id) => { if(confirm("Delete?")) { await CourseService.deleteQuiz(id); refreshData(); }}}
                        onOpenModal={(type, item) => { 
                          setSelectedTopic(item); 
                          if (type === 'quiz') setActiveModal('ai_quiz'); 
                          if (type === 'manual') setActiveModal('manual_quiz');
                        }}
                      />
                  </div>
                </>
             )}

             {activeTab === 'assignments' && (
                <AssignmentList 
                   assignments={assignments} 
                   canEdit={canEdit} 
                   isCourseRep={isCourseRep}
                   uploading={false}
                   courseId={course.id}
                   courseName={course.title}
                   onDelete={async (id) => { if(confirm("Delete?")) { await AssignmentService.delete(id); refreshData(); }}}
                   onSubmit={async (e, id, t, d, p) => { /* logic */ }}
                   onViewSubmissions={() => {}}
                   onViewResult={() => {}}
                   onCreate={() => setActiveModal('assignment')}
                />
             )}

             {activeTab === 'lab' && (
                <MobileGuard>
                   <VirtualLab />
                </MobileGuard>
             )}
          </div>
        </div>
      </div>

      {showPaywall && <CoursePaywallModal courseName={course.title} courseId={course.id} classId={course.class_id} onClose={() => setShowPaywall(false)} />}

      {/* --- MODALS --- */}
      {activeModal === 'announce' && (
        <AnnouncementModal isOpen={true} onClose={() => setActiveModal(null)} classId={course.class_id} lecturerId={userId!} />
      )}

      {activeModal === 'upload_supp' && (
        <UploadResourceModal isOpen={true} onClose={() => setActiveModal(null)} courseId={courseId} onSuccess={refreshData} />
      )}

      {activeModal === 'manual_quiz' && selectedTopic && (
        <ManualQuizModal isOpen={true} onClose={() => setActiveModal(null)} topic={selectedTopic} courseId={courseId} onSuccess={refreshData} />
      )}

      {activeModal === 'ai_quiz' && selectedTopic && (
        <AIQuizModal isOpen={true} onClose={() => setActiveModal(null)} topic={selectedTopic} courseId={courseId} handoutText={materials?.mainHandout?.content_text} onSuccess={refreshData} />
      )}

      {activeModal === 'assignment' && (
        <CreateAssignmentModal onClose={() => setActiveModal(null)} onSubmit={async () => { refreshData(); setActiveModal(null); }} processing={false} data={{}} onChange={() => {}} />
      )}
    </div>
  );
}
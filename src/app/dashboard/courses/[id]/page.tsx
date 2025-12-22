'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic'; 
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowLeft, BookOpen, FileText, FlaskConical, Share2
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { 
  useCourse, 
  useCourseMaterials, 
  useCourseTopics, 
  useCourseAssignments, 
} from '@/hooks/useCourse';
import { CourseWithRelations } from '@/types'; 

// Critical Components
import { CourseHeader } from '@/components/features/course/CourseHeader';
import { CourseSkeleton } from '@/components/skeletons/CourseSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { NotFoundState } from '@/components/NotFoundState';
import { UniBotMascot } from '@/components/ui/UniBotMascot';
import { MobileGuard } from '@/components/features/course/MobileGuard';

// Modals
import { AnnouncementModal } from '@/components/features/course/modals/AnnouncementModal';
import { CoursePaywallModal } from '@/components/features/student/CoursePaywallModal';

// ⚡ Lazy Loaded Tabs
const CourseContentTab = dynamic(
  () => import('@/components/features/course/tabs/CourseContentTab'),
  { loading: () => <CourseSkeleton /> }
);

const CourseAssignmentsTab = dynamic(
  () => import('@/components/features/course/tabs/CourseAssignmentsTab'),
  { loading: () => <div className="h-40 flex items-center justify-center text-slate-400 font-medium">Loading Assignments...</div> }
);

const VirtualLab = dynamic(
  () => import('@/components/features/course/VirtualLab').then((mod) => mod.default),
  { loading: () => <div className="h-96 bg-slate-100 rounded-xl animate-pulse" /> }
);

export default function CoursePage() {
  const params = useParams();
  const courseId = params?.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Auth State
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isCourseRep, setIsCourseRep] = useState(false);
  
  // Data Hooks
  const { data: course, isLoading: loadingCourse, error: courseError } = useCourse(courseId);
  const { data: materials, isLoading: loadingMaterials } = useCourseMaterials(courseId);
  const { data: topics = [] } = useCourseTopics(courseId);
  
  const isStudentView = role === 'student' && course?.classes?.lecturer_id !== userId;
  const { data: assignments = [] } = useCourseAssignments(courseId, userId || undefined, isStudentView);

  // UI State
  const [activeTab, setActiveTab] = useState<'content' | 'assignments' | 'lab'>('content');
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  
  const [hasCourseAccess, setHasCourseAccess] = useState(false);
  const [hasBundleAccess, setHasBundleAccess] = useState(false);

  // Init Auth
  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      setUserId(user.id);
      
      const { data: profile } = await supabase.from('users').select('role, is_course_rep').eq('id', user.id).single();
      setRole(profile?.role);
      setIsCourseRep(profile?.is_course_rep || false);
      
      // Access Check Logic
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

  if (loadingCourse || loadingMaterials) return <CourseSkeleton />;
  if (courseError) return <ErrorState message="Failed to load course" onRetry={() => window.location.reload()} />;
  if (!course) return <NotFoundState title="Course Not Found" />;
  
  // 🔒 Permissions
  const canEditContent = role === 'lecturer'; 

  // ✅ FIX: Strict Type Sanitization
  const safeCourse: CourseWithRelations = {
    ...course,
    
    // 1. Handle Nullable Strings - ensure required fields are never null
    status: course.status || 'active',
    course_code: course.course_code || '',
    lecturer_id: course.lecturer_id || '',
    created_at: course.created_at || new Date().toISOString(),

    // 2. Reconstruct 'classes' to ensure strict shape
    classes: {
      id: course.classes?.id || 'unknown',
      name: course.classes?.name || 'Unknown Class',
      
      // 🔒 SECURITY: Cast only this specific object to read access_code safely
      access_code: (course.classes as { access_code?: string } | null)?.access_code || 'N/A',
      
      // 3. Convert DB 'null' to TS 'undefined'
      lecturer_id: course.classes?.lecturer_id || undefined
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 md:pb-10">
      
      {/* 1. TOP NAVIGATION BAR */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link Copied!"); }}
              className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-full transition"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-6">
        
        {/* 2. COURSE HEADER */}
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <CourseHeader 
            course={safeCourse} // ✅ FIX: Passing the sanitized object!
            isPaywalledAndLocked={!hasCourseAccess && !canEditContent}
            canEdit={canEditContent}
            isCourseRep={isCourseRep}
            onInvite={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link Copied!"); }}
            onAddWeek={() => { /* Handled in Content Tab */ }}
            onAnnounce={() => setShowAnnounceModal(true)} 
          />
        </div>

        {/* 3. CONTROL BAR (Tabs + Chat) */}
        <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4 sticky top-[60px] z-10 bg-slate-50/90 backdrop-blur-sm py-2">
           
           {/* Segmented Control Tabs */}
           <div className="flex bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto">
             {[
               { id: 'content', label: 'Course Content', icon: BookOpen },
               { id: 'assignments', label: 'Assignments', icon: FileText },
               { id: 'lab', label: 'Virtual Lab', icon: FlaskConical }
             ].map((tab) => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                   activeTab === tab.id 
                     ? 'bg-slate-900 text-white shadow-md' 
                     : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                 }`}
               >
                 <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-300' : 'text-slate-400'}`} />
                 {tab.label}
               </button>
             ))}
           </div>

           {/* AI Assistant Button */}
           <button 
              onClick={() => router.push(`/dashboard/chat/${courseId}?type=lesson`)}
              className="group flex items-center justify-center gap-3 bg-white border border-indigo-100 hover:border-indigo-300 pl-3 pr-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md"
           >
              <div className="bg-indigo-50 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
                <UniBotMascot size={22} emotion="happy" />
              </div>
              <div className="text-left">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">AI Tutor</span>
                <span className="text-sm font-bold text-indigo-700 leading-none">Chat with Lesson</span>
              </div>
           </button>
        </div>

        {/* 4. MAIN CONTENT AREA */}
        <div className="min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
           
           {/* Tab 1: Content */}
           {activeTab === 'content' && (
              <div className="grid gap-8 lg:grid-cols-3">
                 <CourseContentTab 
                    courseId={courseId}
                    courseTitle={safeCourse.title}
                    classId={safeCourse.class_id}
                    materials={materials}
                    topics={topics}
                    canEdit={canEditContent} 
                    isCourseRep={isCourseRep}
                    hasCourseAccess={hasCourseAccess}
                    hasBundleAccess={hasBundleAccess}
                    refreshData={refreshData}
                    onUnlockPaywall={() => setShowPaywall(true)}
                 />
              </div>
           )}

           {/* Tab 2: Assignments */}
           {activeTab === 'assignments' && (
              <div className="max-w-4xl">
                 <CourseAssignmentsTab 
                    courseId={courseId}
                    courseName={safeCourse.title}
                    assignments={assignments}
                    canEdit={canEditContent}
                    isCourseRep={isCourseRep}
                    refreshData={refreshData}
                 />
              </div>
           )}

           {/* Tab 3: Virtual Lab */}
           {activeTab === 'lab' && (
              <div className="w-full">
                 <MobileGuard>
                    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                        <VirtualLab />
                    </div>
                 </MobileGuard>
              </div>
           )}
        </div>

      </div>

      {/* --- GLOBAL MODALS --- */}
      {showPaywall && (
        <CoursePaywallModal 
          courseName={safeCourse.title} 
          courseId={safeCourse.id} 
          classId={safeCourse.class_id} 
          onClose={() => setShowPaywall(false)} 
        />
      )}
      
      {showAnnounceModal && (
        <AnnouncementModal 
          isOpen={true} 
          onClose={() => setShowAnnounceModal(false)} 
          classId={safeCourse.class_id} 
          lecturerId={userId!} 
        />
      )}
    </div>
  );
}
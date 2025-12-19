'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic'; // ⚡ Lazy Load
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UniBotMascot } from '@/components/ui/UniBotMascot';
import { supabase } from '@/lib/supabase';
import { 
  useCourse, 
  useCourseMaterials, 
  useCourseTopics, 
  useCourseAssignments, 
} from '@/hooks/useCourse';

// Critical Components (Load immediately for LCP)
import { CourseHeader } from '@/components/features/course/CourseHeader';
import { CourseSkeleton } from '@/components/skeletons/CourseSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { NotFoundState } from '@/components/NotFoundState';

// Modals (Global)
import { AnnouncementModal } from '@/components/features/course/modals/AnnouncementModal';
import { CoursePaywallModal } from '@/components/features/student/CoursePaywallModal';

// ⚡ SUPER LAZY LOAD TABS
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
import { MobileGuard } from '@/components/features/course/MobileGuard';

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
      
      // Access Check
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
  
  // 🔒 PERMISSIONS LOGIC
  // Only ACTUAL Lecturers can edit the Lesson/Syllabus
  const canEditContent = role === 'lecturer'; 
  
  // Course Reps can do logistics (like Announce), but NOT edit content
  const canManageLogistics = role === 'lecturer' || isCourseRep;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button onClick={() => router.back()} className="text-sm font-bold text-slate-400 hover:text-slate-900 flex items-center gap-1 mb-2 transition-colors">← Back</button>
            <CourseHeader 
              course={course}
              isPaywalledAndLocked={!hasCourseAccess && !canEditContent}
              canEdit={canEditContent} // Only lecturer can see "Edit Course Settings"
              isCourseRep={isCourseRep}
              onInvite={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link Copied!"); }}
              onAddWeek={() => { /* Handled in Content Tab */ }}
              onAnnounce={() => setShowAnnounceModal(true)} // Reps CAN announce
            />
          </div>
          
          <div className="flex items-center gap-2">
             <button 
                onClick={() => router.push(`/dashboard/chat/${courseId}?type=lesson`)}
                className="flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-3 rounded-xl text-sm font-bold hover:bg-purple-200 transition shadow-sm"
            >
                <UniBotMascot size={20} emotion="happy" />
                Chat with Lesson
            </button>
          </div>
        </div>

        {/* NAVIGATION */}
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

        {/* MAIN CONTENT AREA */}
        <div className="grid gap-8 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {/* 1. CONTENT TAB */}
             {activeTab === 'content' && (
                <CourseContentTab 
                    courseId={courseId}
                    courseTitle={course.title}
                    classId={course.class_id}
                    materials={materials}
                    topics={topics}
                    
                    // 🔒 SECURITY FIX: Only Lecturer can edit lessons
                    canEdit={canEditContent} 
                    
                    isCourseRep={isCourseRep}
                    hasCourseAccess={hasCourseAccess}
                    hasBundleAccess={hasBundleAccess}
                    refreshData={refreshData}
                    onUnlockPaywall={() => setShowPaywall(true)}
                />
             )}

             {/* 2. ASSIGNMENTS TAB (Lazy Loaded) */}
             {activeTab === 'assignments' && (
                <div className="lg:col-span-2">
                    <CourseAssignmentsTab 
                        courseId={courseId}
                        courseName={course.title}
                        assignments={assignments}
                        canEdit={canEditContent} // Reps usually don't create assignments, only lecturers
                        isCourseRep={isCourseRep}
                        refreshData={refreshData}
                    />
                </div>
             )}

             {/* 3. LAB TAB (Lazy Loaded & Mobile Guarded) */}
             {activeTab === 'lab' && (
                <div className="lg:col-span-3">
                    <MobileGuard>
                        <VirtualLab />
                    </MobileGuard>
                </div>
             )}
        </div>
      </div>

      {/* GLOBAL MODALS */}
      {showPaywall && <CoursePaywallModal courseName={course.title} courseId={course.id} classId={course.class_id} onClose={() => setShowPaywall(false)} />}
      
      {/* Announcement Modal (Available to Lecturers & Reps) */}
      {showAnnounceModal && <AnnouncementModal isOpen={true} onClose={() => setShowAnnounceModal(false)} classId={course.class_id} lecturerId={userId!} />}
    </div>
  );
}
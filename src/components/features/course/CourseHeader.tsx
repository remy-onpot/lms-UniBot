// src/components/features/course/CourseHeader.tsx
import { Course } from '@/types';

interface CourseHeaderProps {
  course: Course | null;
  isPaywalledAndLocked: boolean;
  canEdit: boolean;
  isCourseRep: boolean;
  onInvite?: () => void;
  onAddWeek: () => void;
  onAnnounce: () => void;
}

export function CourseHeader({ 
  course, 
  isPaywalledAndLocked, 
  canEdit, 
  isCourseRep, 
  onInvite, 
  onAddWeek, 
  onAnnounce 
}: CourseHeaderProps) {
  return (
    <div className="relative overflow-hidden bg-linear-to-br from-indigo-950 to-slate-950 rounded-3xl p-8 md:p-10 mb-8 shadow-xl text-white" role="banner" aria-label="Course Header">
      {/* Decorative Circles */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" aria-hidden="true"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" aria-hidden="true"></div>

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-blue-50 border border-white/20">
              Course
            </span>
            {isPaywalledAndLocked && (
                <span className="bg-red-500/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-red-50 border border-red-500/30 flex items-center gap-1" role="status">
                  🔒 Preview Mode
                </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-2 text-white">{course?.title}</h1>
          {/* Fix: text-blue-100 -> text-blue-50 for higher contrast on dark bg */}
          <p className="text-blue-50 text-lg font-medium opacity-90">{course?.classes?.name}</p>
        </div>

        {canEdit && (
          <div className="flex gap-3" role="group" aria-label="Course Actions">
            {isCourseRep ? (
                <button 
                  onClick={onInvite} 
                  aria-label="Invite Lecturer"
                  className="px-5 py-2.5 bg-white text-indigo-950 rounded-xl font-bold text-sm hover:bg-blue-50 transition shadow-lg"
                >
                  Invite Lecturer
                </button>
            ) : (
                <>
                  <button 
                    onClick={onAddWeek} 
                    aria-label="Add a new week"
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 transition shadow-lg shadow-blue-900/50 border border-blue-500/50"
                  >
                    + Add Week
                  </button>
                  <button 
                    onClick={onAnnounce} 
                    aria-label="Send announcement"
                    className="px-5 py-2.5 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold text-sm hover:bg-white/20 transition border border-white/20"
                  >
                    📢 Announce
                  </button>
                </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
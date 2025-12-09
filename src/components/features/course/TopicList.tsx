'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, Lock, Sparkles, BrainCircuit, Play, BarChart3, Trash2, Edit, Unlock, Archive
} from 'lucide-react';
import { Topic, Quiz } from '@/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { CoursePaywallModal } from '@/components/features/student/CoursePaywallModal';
import { BUSINESS_LOGIC } from '@/lib/constants';

interface TopicListProps {
  topics: Topic[];
  isLocked: boolean; // True if user hasn't bought content
  mainHandoutId: string | null;
  canViewAnalysis: boolean;
  canEdit: boolean;
  isCourseRep: boolean;
  courseName: string;
  courseId: string;
  classId: string;
  onUnlock: () => void;
  onDeleteQuiz: (id: string) => void;
  onOpenModal: (type: 'topic' | 'quiz' | 'manual' | 'result_slip', item?: any) => void;
}

export function TopicList({ 
  topics, 
  isLocked, 
  mainHandoutId, 
  canEdit, 
  courseName, 
  courseId, 
  classId, 
  onUnlock, 
  onDeleteQuiz, 
  onOpenModal 
}: TopicListProps) {
  const router = useRouter();
  const [showPaywall, setShowPaywall] = useState(false);

  const visibleTopics = canEdit 
    ? topics 
    : topics.filter((t: any) => t.status !== 'archived');

  const isTopicLocked = (weekNumber: number) => {
    if (canEdit) return false;
    if (!isLocked) return false; // Paid
    return weekNumber > BUSINESS_LOGIC.COHORT.free_weeks; // > 2
  };

  const handleAction = (action: () => void, weekNumber: number) => {
    if (isTopicLocked(weekNumber)) {
      setShowPaywall(true); 
    } else {
      action(); 
    }
  };

  if (visibleTopics.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <FileText className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">No active topics</h3>
        {canEdit && (
          <Button onClick={() => onOpenModal('topic')} variant="outline" size="sm" className="mt-4">
            Add Week 1
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {visibleTopics.map((topic: any) => {
          const locked = isTopicLocked(topic.week_number);
          const isArchived = topic.status === 'archived';
          const isHandoutLinked = topic.start_page && topic.end_page && mainHandoutId;

          return (
            <div key={topic.id} className={cn("group relative bg-white rounded-3xl border transition-all overflow-hidden", isArchived ? "border-orange-200 bg-orange-50/30" : locked ? "border-slate-200" : "border-slate-200 hover:border-indigo-200 hover:shadow-lg")}>
              
              {isArchived && canEdit && (
                <div className="absolute top-4 right-4 z-10 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                   <Archive className="w-3 h-3" /> Archived
                </div>
              )}

              {locked && !canEdit && (
                <div className="absolute inset-0 z-20 backdrop-blur-md bg-white/60 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-3 shadow-xl">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Week {topic.week_number} Locked</h3>
                  <Button onClick={() => setShowPaywall(true)} className="mt-4 bg-linear-to-r from-indigo-600 to-purple-600 text-white font-bold">
                    <Unlock className="w-4 h-4 mr-2" /> Unlock Now
                  </Button>
                </div>
              )}

              <div className={`p-6 md:p-8 ${isArchived ? 'opacity-70' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wider">Week {topic.week_number}</span>
                    {isHandoutLinked && !isArchived && <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1"><FileText className="w-3 h-3" /> Pg {topic.start_page}-{topic.end_page}</span>}
                  </div>
                  {canEdit && !locked && !isArchived && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onOpenModal('quiz', topic)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Sparkles className="w-4 h-4" /></button>
                      <button onClick={() => onOpenModal('manual', topic)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"><Edit className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight">{topic.title}</h3>
                <p className="text-slate-600 leading-relaxed mb-6 text-sm">{topic.description || "No description provided."}</p>

                {!isArchived && (
                  <div className="flex flex-wrap gap-3">
                    {isHandoutLinked ? (
                      <button 
                        onClick={() => handleAction(
                          // ✅ PASS TOPIC ID
                          () => router.push(`/dashboard/chat/${mainHandoutId}?pages=${topic.start_page}-${topic.end_page}&topicId=${topic.id}`), 
                          topic.week_number
                        )}
                        disabled={locked}
                        className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition disabled:opacity-50"
                      >
                        <BrainCircuit className="w-4 h-4" /> Study with AI
                      </button>
                    ) : (
                      <button disabled className="flex-1 md:flex-initial px-5 py-3 bg-slate-100 text-slate-400 rounded-xl font-bold text-sm cursor-not-allowed">No PDF</button>
                    )}

                    {/* @ts-ignore */}
                    {topic.quizzes?.length > 0 && (
                      <div className="flex-1 flex flex-col gap-2 min-w-[200px]">
                        {/* @ts-ignore */}
                        {topic.quizzes.map((quiz: Quiz) => (
                          <div key={quiz.id} className="flex items-center gap-2 bg-slate-50 p-1.5 pr-3 rounded-xl border border-slate-100 hover:border-indigo-200 transition">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600"><Play className="w-3 h-3 fill-current" /></div>
                            <span className="text-xs font-bold text-slate-700 truncate flex-1">{quiz.title}</span>
                            {canEdit ? (
                              <div className="flex gap-1">
                                <button onClick={() => router.push(`/dashboard/quiz/${quiz.id}/gradebook`)} className="p-1.5 text-slate-400 hover:text-blue-600 transition"><BarChart3 className="w-3 h-3" /></button>
                                <button onClick={() => onDeleteQuiz(quiz.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            ) : (
                              <button onClick={() => handleAction(() => router.push(`/dashboard/quiz/${quiz.id}`), topic.week_number)} disabled={locked} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg hover:bg-indigo-200 transition disabled:opacity-50">Start</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showPaywall && (
        <CoursePaywallModal 
          courseName={courseName}
          courseId={courseId}
          classId={classId}
          onClose={() => setShowPaywall(false)}
        />
      )}
    </>
  );
}
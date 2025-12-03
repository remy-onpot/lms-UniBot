import React from 'react';
import Link from 'next/link';
import { Topic } from '@/types';

interface TopicListProps {
  topics: Topic[];
  isLocked: boolean;
  mainHandoutId: string | null;
  canViewAnalysis: boolean;
  canEdit: boolean;
  isCourseRep: boolean;
  onUnlock: () => void;
  onDeleteQuiz: (id: string) => void;
  onOpenModal: (type: 'quiz' | 'manual', item: any) => void;
}

export function TopicList({
  topics,
  isLocked,
  mainHandoutId,
  canViewAnalysis,
  canEdit,
  isCourseRep,
  onUnlock,
  onDeleteQuiz,
  onOpenModal
}: TopicListProps) {
  return (
    <div className="space-y-6">
      {topics.map(topic => {
        const topicLocked = isLocked && topic.week_number > 1;

        return (
          <div key={topic.id} className={`group bg-white p-6 rounded-3xl border ${topicLocked ? 'border-red-100 bg-red-50/10' : 'border-slate-100 hover:border-blue-200'} shadow-sm hover:shadow-md transition-all relative overflow-hidden`}>
            {topicLocked && (
               <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-red-200">
                 LOCKED CONTENT
               </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h3 className="font-bold text-xl text-slate-900 flex items-center gap-3">
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-sm">W{topic.week_number}</span>
                  {topic.title}
                </h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">{topic.description}</p>
              </div>
              
              {mainHandoutId && !topicLocked && (
                <Link href={`/dashboard/chat/${mainHandoutId}?pages=${topic.start_page}-${topic.end_page}`} className="shrink-0 px-4 py-2 bg-purple-50 text-purple-700 text-xs font-bold rounded-xl border border-purple-100 hover:bg-purple-100 transition flex items-center gap-1">
                  <span>🤖</span> Study AI
                </Link>
              )}
            </div>

            <div className="pt-4 border-t border-slate-50 flex flex-wrap gap-2 items-center">
              {topicLocked ? (
                <button 
                  onClick={onUnlock} 
                  className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition flex justify-center items-center gap-2"
                >
                  <span>🔓 Unlock Full Access</span>
                </button>
              ) : (
                <>
                  {topic.quizzes?.[0] ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Link href={canViewAnalysis ? `/dashboard/quiz/${topic.quizzes[0].id}/gradebook` : `/dashboard/quiz/${topic.quizzes[0].id}`} className="flex-1 sm:flex-none text-center px-5 py-2.5 bg-green-100 text-green-800 text-sm font-bold rounded-xl hover:bg-green-200 transition">
                            {canViewAnalysis ? '📊 View Analytics' : '📝 Take Quiz'}
                        </Link>
                        {canEdit && !isCourseRep && (
                            <button onClick={() => onDeleteQuiz(topic.quizzes[0].id)} className="px-3 py-2.5 text-red-400 hover:bg-red-50 rounded-xl transition">🗑️</button>
                        )}
                    </div>
                  ) : canEdit && !isCourseRep ? (
                    <div className="flex gap-2">
                      <button onClick={() => onOpenModal('quiz', topic)} className="px-4 py-2 bg-orange-50 text-orange-600 text-sm font-bold rounded-xl hover:bg-orange-100 border border-orange-200">✨ AI Gen</button>
                      <button onClick={() => onOpenModal('manual', topic)} className="px-4 py-2 bg-slate-50 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-100 border border-slate-200">✍️ Manual</button>
                    </div>
                  ) : <span className="text-xs font-bold text-slate-300 bg-slate-50 px-3 py-1 rounded-full">No quiz yet</span>}
                </>
              )}
              
              <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded">
                Pg {topic.start_page}-{topic.end_page}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
'use client';

import { useState } from 'react';
import { 
  ChevronDown, ChevronUp, BookOpen, Trash2, Sparkles, Lock, FileText, X
} from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { PDFViewer } from '@/components/features/chat/PDFViewer'; // ✅ Import Viewer

interface Topic {
  id: string;
  week_number: number;
  title: string;
  description: string;
  start_page?: number;
  end_page?: number;
}

interface TopicListProps {
  topics: Topic[];
  isLocked: boolean;
  mainHandoutId: string | null;
  mainHandoutUrl?: string; // ✅ NEW: Need URL to render PDF
  canViewAnalysis: boolean;
  canEdit: boolean;
  isCourseRep: boolean;
  courseName: string;
  courseId: string;
  classId: string;
  onUnlock: () => void;
  onDeleteQuiz: (id: string) => void;
  onOpenModal: (type: any, item: any) => void;
}

export function TopicList({ 
  topics, 
  isLocked, 
  mainHandoutId,
  mainHandoutUrl, 
  canEdit, 
  onUnlock, 
  onOpenModal 
}: TopicListProps) {
  
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  const toggleTopic = (id: string) => {
    setExpandedTopicId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {topics.map((topic) => {
        // Business Logic: Lock content if it's past week 2 and user hasn't paid
        const isContentLocked = isLocked && topic.week_number > 2;
        const isExpanded = expandedTopicId === topic.id;

        return (
          <div 
            key={topic.id} 
            className={`bg-white rounded-2xl border transition-all duration-300 ${
              isExpanded ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-slate-200 hover:border-indigo-100'
            }`}
          >
            {/* --- TOPIC HEADER --- */}
            <div 
              className="p-5 cursor-pointer flex items-start gap-4"
              onClick={() => !isContentLocked && toggleTopic(topic.id)}
            >
              <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0 font-bold ${
                isContentLocked ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-700'
              }`}>
                <span className="text-[10px] uppercase tracking-wider">Week</span>
                <span className="text-xl leading-none">{topic.week_number}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`text-base font-bold truncate ${isContentLocked ? 'text-slate-400' : 'text-slate-900'}`}>
                    {topic.title}
                  </h3>
                  {isContentLocked && <Lock className="w-3 h-3 text-orange-500" />}
                </div>
                <p className="text-sm text-slate-500 line-clamp-2">
                  {topic.description || "No description provided."}
                </p>
                
                {/* Page Range Badge */}
                {(topic.start_page && topic.start_page > 0) && (
                  <div className="flex items-center gap-1 mt-2 text-xs font-medium text-slate-400">
                    <BookOpen className="w-3 h-3" />
                    <span>Pgs {topic.start_page} - {topic.end_page}</span>
                  </div>
                )}
              </div>

              <div className="self-center">
                {isContentLocked ? (
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onUnlock(); }}>
                    Unlock
                  </Button>
                ) : (
                  <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                )}
              </div>
            </div>

            {/* --- EXPANDED CONTENT --- */}
            {isExpanded && !isContentLocked && (
              <div className="border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                
                {/* 1. Action Bar */}
                <div className="p-4 flex flex-wrap gap-2 items-center justify-between">
                   <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-white"
                        onClick={() => onOpenModal('quiz', topic)}
                      >
                        <Sparkles className="w-3 h-3 mr-2 text-purple-600" /> 
                        Take AI Quiz
                      </Button>
                      
                      {canEdit && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => onOpenModal('delete', topic)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                   </div>

                   {/* Close Button */}
                   <button 
                     onClick={() => setExpandedTopicId(null)}
                     className="text-xs text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1"
                   >
                     Close <X className="w-3 h-3" />
                   </button>
                </div>

                {/* 2. THE FOCUSED READER */}
                {mainHandoutUrl && (
                  <div className="px-4 pb-6">
                    <div className="h-[600px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative group">
                       <div className="absolute inset-0 bg-slate-50 flex items-center justify-center text-slate-400 group-hover:hidden transition-all z-0">
                          Click to interact with Reader
                       </div>
                       
                       {/* ✅ THIS IS THE FEATURE: Only load relevant pages */}
                       <div className="h-full z-10 relative">
                         <PDFViewer 
                            url={mainHandoutUrl} 
                            focusedRange={topic.start_page ? { start: topic.start_page, end: topic.end_page || topic.start_page + 5 } : undefined} 
                         />
                       </div>
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-2">
                      Showing pages {topic.start_page}-{topic.end_page} from the main handout.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {topics.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 font-medium">No topics yet</p>
          {canEdit && <p className="text-xs text-slate-400">Upload a syllabus to auto-generate</p>}
        </div>
      )}
    </div>
  );
}
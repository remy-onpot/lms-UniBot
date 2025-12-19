'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookReaderProps {
  content: string;
}

export default function BookReader({ content }: BookReaderProps) {
  const [currentPage, setCurrentPage] = useState(0);

  // 1. SPLIT LOGIC: Break content into pages by <hr> tags
  const pages = useMemo(() => {
    if (!content) return [];
    // Split by <hr> tag. 
    // Works whether it's <hr>, <hr/>, or <hr class="...">
    const splitContent = content.split(/<hr[^>]*>/i);
    return splitContent.filter(page => page.trim().length > 0);
  }, [content]);

  // Reset to page 0 if content changes completely
  useEffect(() => {
    setCurrentPage(0);
  }, [content.length]);

  if (pages.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
        No content available.
      </div>
    );
  }

  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === pages.length - 1;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      
      {/* 2. READER AREA (Full Width) */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto min-h-[500px] bg-white">
         <div className="max-w-none mx-auto prose prose-lg prose-slate w-full">
            {/* Render ONLY the current page */}
            <div dangerouslySetInnerHTML={{ __html: pages[currentPage] }} />
         </div>
      </div>

      {/* 3. PAGINATION CONTROLS (Footer) */}
      <div className="border-t border-slate-100 bg-slate-50/80 p-4 flex items-center justify-between backdrop-blur-sm sticky bottom-0">
         
         {/* Prev Button */}
         <button 
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={isFirstPage}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
         >
            <ChevronLeft className="w-4 h-4" /> Previous
         </button>

         {/* Page Indicator */}
         <div className="text-xs font-bold text-slate-400 bg-slate-200/50 px-3 py-1 rounded-full">
            Page {currentPage + 1} <span className="text-slate-300">/</span> {pages.length}
         </div>

         {/* Next Button */}
         <button 
            onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
            disabled={isLastPage}
            className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-sm",
                isLastPage 
                 ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                 : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md"
            )}
         >
            {isLastPage ? 'Finished' : 'Next Page'} <ChevronRight className="w-4 h-4" />
         </button>
      </div>
    </div>
  );
}
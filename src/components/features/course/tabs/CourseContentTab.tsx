'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Loader2, FileUp, Sparkles, Lock, BookOpen, Edit, Upload 
} from 'lucide-react';

import { extractDataFromPDF } from '@/lib/utils/pdf-utils';
import { extractDataFromDocx } from '@/lib/utils/docx-utils'; // ✅ NEW: Word Support
import { CourseService } from '@/lib/services/course.service';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

// Components
import { CourseMaterials } from '@/components/features/course/CourseMaterials';
import { TopicList } from '@/components/features/course/TopicList';
import LessonEditor from '@/components/features/editor/LessonEditor';

// Modals
import { UploadResourceModal } from '@/components/features/course/modals/UploadResourceModal';
import { ManualQuizModal } from '@/components/features/course/modals/ManualQuizModal';
import { AIQuizModal } from '@/components/features/course/modals/AIQuizModal';

/**
 * 🦴 HELPER: Skeleton Extractor
 * Extracts only headings and lists to save AI tokens during Syllabus Gen.
 */
const extractStructureFromHTML = (html: string) => {
  if (typeof window === 'undefined') return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const structuralElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, li');
  let structure = "";
  structuralElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text) {
          const tagName = el.tagName.toLowerCase();
          if (tagName === 'li') structure += `- ${text}\n`;
          else structure += `[${tagName.toUpperCase()}] ${text}\n`;
      }
  });
  if (structure.length < 500) return doc.body.textContent?.slice(0, 10000) || "";
  return structure;
};

interface CourseContentTabProps {
  courseId: string;
  courseTitle: string;
  classId: string;
  materials: any;
  topics: any[];
  canEdit: boolean;
  isCourseRep: boolean;
  hasCourseAccess: boolean;
  hasBundleAccess: boolean;
  refreshData: () => void;
  onUnlockPaywall: () => void;
}

export default function CourseContentTab({
  courseId,
  courseTitle,
  classId,
  materials,
  topics,
  canEdit,
  isCourseRep,
  hasCourseAccess,
  hasBundleAccess,
  refreshData,
  onUnlockPaywall
}: CourseContentTabProps) {
  
  // --- STATE ---
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [lessonContent, setLessonContent] = useState('');
  const [savingLesson, setSavingLesson] = useState(false);
  const [processingSyllabus, setProcessingSyllabus] = useState(false);

  // Modal State
  const [activeModal, setActiveModal] = useState<'upload_supp' | 'manual_quiz' | 'ai_quiz' | 'topic' | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);

  // Sync content from DB
  useEffect(() => {
    if (materials?.mainHandout?.content_text) {
      setLessonContent(materials.mainHandout.content_text);
    }
  }, [materials]);

  // --- HANDLERS ---

  /**
   * 📄 SMART IMPORT (Word & PDF)
   */
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    
    // Safety Limit (20MB)
    if (file.size > 20 * 1024 * 1024) {
       toast.error("File is too large (Max 20MB).");
       return;
    }

    const toastId = toast.loading("Reading document...");
    try {
        let content = "";
        
        // A. Handle WORD (.docx) - High Fidelity
        if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith(".docx")) {
            content = await extractDataFromDocx(file);
            toast.success("Word Document Imported! Formatting preserved.", { id: toastId });
        } 
        // B. Handle PDF - Fallback
        else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
            toast.loading("Extracting PDF text (this might lose some formatting)...", { id: toastId });
            const { fullText } = await extractDataFromPDF(file);
            content = fullText;
            toast.success("PDF Content Imported.", { id: toastId });
        } 
        else {
            throw new Error("Unsupported file type. Please use .docx or .pdf");
        }

        setLessonContent(content); 

    } catch (err: any) {
        toast.error("Failed to import file", { id: toastId, description: err.message });
    } finally {
        // Reset input
        e.target.value = "";
    }
  };

  const handleSaveLesson = async (html: string) => {
    setSavingLesson(true);
    try {
        await CourseService.updateMainLesson(courseId, html);
        setLessonContent(html);
        setIsEditingLesson(false);
        toast.success("Lesson Saved Successfully");
        refreshData();
    } catch (err) {
        console.error(err);
        toast.error("Failed to save lesson");
    } finally {
        setSavingLesson(false);
    }
  };

  const handleGenerateTopicsFromEditor = async () => {
    if (!lessonContent || lessonContent.length < 100) return toast.error("Lesson content is too short.");
    setProcessingSyllabus(true);
    const toastId = toast.loading("Extracting Course Structure...");
    try {
        const structuralText = extractStructureFromHTML(lessonContent);
        const res = await fetch('/api/generate-syllabus', {
            method: 'POST',
            body: JSON.stringify({ syllabusText: structuralText, courseId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");
        toast.success(`Generated ${data.count} topics!`, { id: toastId });
        refreshData();
    } catch (e: any) {
        toast.error("Generation Error", { id: toastId, description: e.message });
    } finally {
        setProcessingSyllabus(false);
    }
  };

  const handleSyllabusUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setProcessingSyllabus(true);
    const toastId = toast.loading("Analyzing Syllabus...");
    try {
        const file = e.target.files[0];
        const pdfData = await extractDataFromPDF(file);
        if (pdfData.isScanned) throw new Error("Scanned PDF detected.");
        if (pdfData.fullText.length < 50) throw new Error("File appears empty.");

        const res = await fetch('/api/generate-syllabus', {
            method: 'POST',
            body: JSON.stringify({ syllabusText: pdfData.fullText, courseId })
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

  // Safe Access for TypeScript
  const supplementaryMaterials = materials?.supplementary || [];

  return (
    <>
      <div className={cn("space-y-8 transition-all duration-300", isEditingLesson ? "lg:col-span-3" : "lg:col-span-2")}>
        
        {/* 1. NATIVE LESSON EDITOR */}
        <div className={cn("bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all", isEditingLesson && "ring-2 ring-indigo-50 border-indigo-100")}>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        <h2 className="font-bold text-slate-900">Lesson Material</h2>
                </div>
                {canEdit && (
                    <div className="flex gap-2">
                        {isEditingLesson ? (
                            <button onClick={() => setIsEditingLesson(false)} className="text-xs font-bold text-slate-500 hover:text-slate-900 px-3 py-1">Cancel</button>
                        ) : (
                            <button onClick={() => setIsEditingLesson(true)} className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition">
                                <Edit className="w-3 h-3" /> Edit Lesson
                            </button>
                        )}
                    </div>
                )}
            </div>

            {isEditingLesson ? (
                <div className="p-0">
                    {!lessonContent && (
                         <div className="m-4 bg-indigo-50 p-6 rounded-xl border border-indigo-100 text-center">
                            <p className="text-base text-indigo-900 font-bold mb-1">Start from scratch or import a file</p>
                            <p className="text-xs text-indigo-600 mb-4">
                                ✨ <strong>Pro Tip:</strong> Word documents (.docx) give the best results!
                            </p>
                            
                            <label className="cursor-pointer inline-flex items-center gap-2 bg-white border border-indigo-200 text-indigo-700 px-6 py-3 rounded-xl text-sm font-bold hover:bg-indigo-50 transition shadow-sm hover:shadow-md">
                                <Upload className="w-4 h-4" /> 
                                Import Word / PDF
                                <input 
                                    type="file" 
                                    accept=".pdf,.docx" 
                                    onChange={handleImportFile} 
                                    className="hidden" 
                                />
                            </label>
                        </div>
                    )}
                    <LessonEditor initialContent={lessonContent} onSave={handleSaveLesson} isSaving={savingLesson} />
                </div>
            ) : (
                <div className="p-8 prose prose-slate prose-lg max-w-none">
                    {lessonContent ? (
                        <div dangerouslySetInnerHTML={{ __html: lessonContent }} />
                    ) : (
                        <div className="text-center py-10">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                <FileUp className="w-6 h-6 text-slate-300" />
                            </div>
                            <h3 className="text-slate-400 font-bold">No lesson content yet.</h3>
                            {canEdit && <p className="text-sm text-slate-400 mt-1">Click "Edit Lesson" to write or import a Word/PDF file.</p>}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* 2. SUPPLEMENTARY FILES (Safe Check) */}
        {supplementaryMaterials.length > 0 && (
            <CourseMaterials 
                mainHandout={null} 
                supplementaryMaterials={supplementaryMaterials}
                hasBundleAccess={hasBundleAccess || canEdit} 
                onUnlockBundle={onUnlockPaywall}
                canEdit={canEdit}
                isCourseRep={isCourseRep}
                uploading={false}
                onUploadMain={() => {}} 
                onUploadSupp={() => setActiveModal('upload_supp')} 
            />
        )}

        {/* 3. WEEKLY TOPICS */}
        <div className="space-y-4 pt-4 border-t border-dashed border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><Sparkles className="w-5 h-5" /></span>
                    Weekly Topics
                </h2>
                
                {!hasCourseAccess && !canEdit && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                        <Lock className="w-3 h-3" /> Weeks 1-2 Free
                    </div>
                )}

                {canEdit && (
                    <div className="flex items-center gap-2">
                        {/* Gen Topics Button */}
                        <Button 
                            onClick={handleGenerateTopicsFromEditor}
                            disabled={processingSyllabus || !lessonContent}
                            size="sm" 
                            variant="outline"
                            className="text-xs border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100"
                        >
                            {processingSyllabus ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                            Gen from Editor
                        </Button>

                        {/* Upload Syllabus PDF Button */}
                        <label className="cursor-pointer flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold hover:border-indigo-300 hover:text-indigo-600 transition shadow-sm">
                            <Upload className="w-3 h-3" /> Upload PDF
                            <input type="file" accept=".pdf" onChange={handleSyllabusUpload} className="hidden" disabled={processingSyllabus} />
                        </label>

                        <Button onClick={() => setActiveModal('topic')} size="sm" variant="outline">+ Topic</Button>
                    </div>
                )}
            </div>
            
            <TopicList 
                topics={topics}
                isLocked={!hasCourseAccess} 
                mainHandoutId={null} 
                mainHandoutUrl={undefined}
                canViewAnalysis={canEdit}
                canEdit={canEdit}
                isCourseRep={isCourseRep}
                courseName={courseTitle}
                courseId={courseId}
                classId={classId}
                onUnlock={onUnlockPaywall}
                onDeleteQuiz={async (id) => { if(confirm("Delete?")) { await CourseService.deleteQuiz(id); refreshData(); }}}
                onOpenModal={(type, item) => { 
                    setSelectedTopic(item); 
                    if (type === 'quiz') setActiveModal('ai_quiz'); 
                    if (type === 'manual') setActiveModal('manual_quiz');
                }}
            />
        </div>
      </div>

      {/* --- LOCAL MODALS --- */}
      {activeModal === 'upload_supp' && (
        <UploadResourceModal isOpen={true} onClose={() => setActiveModal(null)} courseId={courseId} onSuccess={refreshData} />
      )}
      {activeModal === 'manual_quiz' && selectedTopic && (
        <ManualQuizModal isOpen={true} onClose={() => setActiveModal(null)} topic={selectedTopic} courseId={courseId} onSuccess={refreshData} />
      )}
      {activeModal === 'ai_quiz' && selectedTopic && (
        <AIQuizModal isOpen={true} onClose={() => setActiveModal(null)} topic={selectedTopic} courseId={courseId} handoutText={lessonContent} onSuccess={refreshData} />
      )}
    </>
  );
}
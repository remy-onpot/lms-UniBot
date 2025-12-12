'use client';
import { useState } from 'react';
import { FileText, Download, Sparkles, Lock, BrainCircuit, ExternalLink } from 'lucide-react';
import { Material } from '@/types';
import { useRouter } from 'next/navigation';
// ✅ NEW: Import Offline Tools
import { OfflineDownloadButton } from './OfflineDownloadButton';
import { SmartFileLink } from './SmartFileLink';

interface CourseMaterialsProps {
  mainHandout: Material | null;
  supplementaryMaterials: Material[];
  hasBundleAccess: boolean;
  onUnlockBundle: () => void;
  
  // Legacy props
  canEdit: boolean;
  isCourseRep: boolean;
  uploading: boolean;
  onUploadMain: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadSupp: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CourseMaterials({ 
  mainHandout, 
  supplementaryMaterials, 
  hasBundleAccess,
  onUnlockBundle,
  canEdit, 
  isCourseRep, 
  uploading, 
  onUploadMain, 
  onUploadSupp 
}: CourseMaterialsProps) {
  const router = useRouter();

  const handleSolvePastQuestion = (materialId: string) => {
    if (!hasBundleAccess && !canEdit) {
      onUnlockBundle(); 
      return;
    }
    router.push(`/dashboard/solver/${materialId}`);
  };

  return (
    <div className="space-y-8">
      {/* HANDOUT SECTION */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-red-700 bg-red-50 p-1.5 rounded-lg"><FileText className="w-5 h-5" /></span> 
          Main Handout
        </h2>
        {mainHandout ? (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-indigo-200 transition">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-700 rounded-xl flex items-center justify-center font-bold text-xs shrink-0">PDF</div>
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition">{mainHandout.title}</p>
                  <p className="text-xs text-slate-500">Core Reading Material</p>
                </div>
             </div>
             
             <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* ✅ SMART LINK (Works Offline) */}
                <SmartFileLink 
                  id={mainHandout.id}
                  fileUrl={mainHandout.file_url}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 flex items-center gap-2 transition"
                >
                   <ExternalLink className="w-4 h-4" /> View
                </SmartFileLink>

                {/* ✅ DOWNLOAD TOGGLE */}
                <div className="shrink-0">
                  <OfflineDownloadButton 
                    id={mainHandout.id}
                    courseId={mainHandout.course_id}
                    fileUrl={mainHandout.file_url}
                    fileName={mainHandout.title}
                    type="handout"
                    variant="icon"
                  />
                </div>
             </div>
          </div>
        ) : (
          canEdit ? (
            <label className="block w-full border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <span className="text-slate-700 font-bold text-sm">Upload PDF Handout</span>
              <input type="file" accept=".pdf" onChange={onUploadMain} disabled={uploading} className="hidden"/>
            </label>
          ) : <p className="text-slate-400 italic text-sm">No handout available.</p>
        )}
      </section>

      {/* SUPPLEMENTARY SECTION */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="text-blue-700 bg-blue-50 p-1.5 rounded-lg"><BrainCircuit className="w-5 h-5" /></span> 
            Resources & Past Questions
          </h2>
          {canEdit && (
            <label className="cursor-pointer text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
              + Upload
              <input type="file" accept=".pdf,.png,.jpg" onChange={onUploadSupp} disabled={uploading} className="hidden"/>
            </label>
          )}
        </div>
        
        <div className="grid gap-3">
          {supplementaryMaterials.map(m => (
            <div key={m.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                    <FileText className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-700 truncate">{m.title}</span>
              </div>
              
              <div className="flex gap-2 shrink-0">
                {/* AI SOLVER BUTTON */}
                <button 
                  onClick={() => handleSolvePastQuestion(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    (hasBundleAccess || canEdit) 
                      ? 'bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {(hasBundleAccess || canEdit) ? <Sparkles className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {(hasBundleAccess || canEdit) ? 'AI Solve' : 'Unlock'}
                </button>

                {/* ✅ SMART VIEW */}
                <SmartFileLink 
                  id={m.id}
                  fileUrl={m.file_url}
                  className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg hover:bg-blue-50 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                </SmartFileLink>

                {/* ✅ OFFLINE TOGGLE */}
                <OfflineDownloadButton 
                   id={m.id}
                   courseId={m.course_id}
                   fileUrl={m.file_url}
                   fileName={m.title}
                   type="handout" // Keeping as 'handout' to match strict types for now
                   variant="icon"
                />
              </div>
            </div>
          ))}
          {supplementaryMaterials.length === 0 && <p className="text-slate-400 italic text-sm pl-2">No resources yet.</p>}
        </div>
      </section>
    </div>
  );
}
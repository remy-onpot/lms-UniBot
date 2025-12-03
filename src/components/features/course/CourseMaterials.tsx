import React from 'react';
import Link from 'next/link';
import { Material } from '@/types';

interface CourseMaterialsProps {
  mainHandout: Material | null;
  supplementaryMaterials: Material[];
  canEdit: boolean;
  isCourseRep: boolean;
  uploading: boolean;
  onUploadMain: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadSupp: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CourseMaterials({ 
  mainHandout, 
  supplementaryMaterials, 
  canEdit, 
  isCourseRep, 
  uploading, 
  onUploadMain, 
  onUploadSupp 
}: CourseMaterialsProps) {
  return (
    <div className="space-y-8">
      {/* HANDOUT */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-red-500 bg-red-50 p-1.5 rounded-lg text-lg">📕</span> Main Handout
        </h2>
        
        {mainHandout ? (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center font-bold text-xs shadow-inner">
                  PDF
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition">{mainHandout.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Core Reading Material</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <a href={mainHandout.file_url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition">View</a>
                <Link href={`/dashboard/chat/${mainHandout.id}`} className="px-4 py-2 bg-purple-100 text-purple-700 text-sm font-bold rounded-xl hover:bg-purple-200 transition flex items-center gap-2">
                  <span>✨</span> Ask AI
                </Link>
              </div>
            </div>
          </div>
        ) : (
          canEdit ? (
            !isCourseRep ? (
              <label className="block w-full border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                <span className="text-4xl block mb-2">📄</span>
                <span className="text-slate-600 font-medium">Upload Main Handout (PDF)</span>
                <input type="file" accept=".pdf" onChange={onUploadMain} disabled={uploading} className="hidden"/>
              </label>
            ) : <p className="text-slate-400 italic text-sm border-2 border-dashed border-slate-200 p-6 rounded-2xl text-center">Lecturer hasn't uploaded a handout yet.</p>
          ) : <p className="text-slate-400 italic text-sm border-2 border-dashed border-slate-200 p-6 rounded-2xl text-center">No handout available.</p>
        )}
      </section>

      {/* SUPPLEMENTARY */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="text-blue-500 bg-blue-50 p-1.5 rounded-lg text-lg">📚</span> Resources
          </h2>
          {canEdit && !isCourseRep && (
            <label className="cursor-pointer text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
              + Upload
              <input type="file" accept=".pdf" onChange={onUploadSupp} disabled={uploading} className="hidden"/>
            </label>
          )}
        </div>
        
        <div className="space-y-3">
          {supplementaryMaterials.map(m => (
            <div key={m.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-blue-200 transition">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm">📎</div>
                <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{m.title}</span>
              </div>
              <a href={m.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">Download</a>
            </div>
          ))}
          {supplementaryMaterials.length === 0 && <p className="text-sm text-slate-400 italic pl-2">No additional resources.</p>}
        </div>
      </section>
    </div>
  );
}
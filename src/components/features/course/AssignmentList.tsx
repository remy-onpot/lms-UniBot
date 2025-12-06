import React from 'react';
import { Assignment } from '@/types';

interface AssignmentListProps {
  assignments: Assignment[];
  canEdit: boolean;
  isCourseRep: boolean;
  uploading: boolean;
  onDelete: (id: string) => void;
  onSubmit: (e: React.ChangeEvent<HTMLInputElement>, id: string, title: string, desc: string, points: number) => void;
  onViewSubmissions: (id: string, title: string) => void;
  onViewResult: (sub: any, title: string) => void;
  onCreate: () => void;
}

export function AssignmentList({
  assignments,
  canEdit,
  isCourseRep,
  uploading,
  onDelete,
  onSubmit,
  onViewSubmissions,
  onViewResult,
  onCreate
}: AssignmentListProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-slate-900">Assignments</h2>
        {canEdit && !isCourseRep && (
            <button 
              onClick={onCreate} 
              aria-label="Create new assignment"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition"
            >
                + Create New
            </button>
        )}
      </div>
      
      {assignments.map(assign => {
        const isLate = new Date() > new Date(assign.due_date);
        return (
          <div key={assign.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex gap-2 items-center mb-2">
                    <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">Assignment</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold">{assign.total_points} Pts</span>
                </div>
                <h3 className="font-bold text-lg text-slate-900">{assign.title}</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">{assign.description}</p>
                <div className="flex gap-2 items-center text-xs font-bold">
                   <span className="text-slate-400">Due Date:</span>
                   <span className={`${isLate ? 'text-red-500' : 'text-slate-700'}`}>
                      {new Date(assign.due_date).toLocaleDateString()}{isLate ? ' (Closed)' : ''}
                   </span>
                </div>
              </div>
              
              {canEdit && !isCourseRep && (
                <button 
                  onClick={() => onDelete(assign.id)} 
                  aria-label={`Delete assignment ${assign.title}`}
                  className="text-slate-300 hover:text-red-500 transition"
                >
                  <span aria-hidden="true">✕</span>
                </button>
              )}
            </div>

            {!canEdit && (
              <div className="mt-6 pt-4 border-t border-slate-50">
                {assign.mySubmission ? (
                   <div className="flex justify-between items-center bg-green-50/50 p-4 rounded-xl border border-green-100">
                      <div>
                         <p className="text-sm font-bold text-green-800 flex items-center gap-2">
                            ✅ Submitted <span className="text-xs font-normal opacity-70">({assign.mySubmission.attempt_count}/2)</span>
                         </p>
                         <p className="text-xs text-green-700 mt-1 font-mono">
                            Grade: {assign.mySubmission.lecturer_grade !== null ? assign.mySubmission.lecturer_grade : (assign.mySubmission.ai_grade || 'Pending')}
                         </p>
                      </div>
                      <button onClick={() => onViewResult(assign.mySubmission, assign.title)} className="text-xs bg-white border border-green-200 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 font-bold shadow-sm">View Feedback</button>
                   </div>
                ) : (
                   <div>
                      {isLate ? (
                         <p className="text-sm text-red-500 italic bg-red-50 p-3 rounded-lg text-center">Submission closed.</p>
                      ) : (
                         <label className="block w-full py-3 bg-slate-900 text-white text-center rounded-xl font-bold cursor-pointer hover:bg-slate-800 transition shadow-lg relative overflow-hidden">
                           {uploading ? 'Grading...' : 'Upload Submission (PDF)'}
                           <input type="file" accept=".pdf" onChange={(e) => onSubmit(e, assign.id, assign.title, assign.description, assign.total_points)} disabled={uploading} className="hidden"/>
                         </label>
                      )}
                   </div>
                )}
              </div>
            )}

            {canEdit && (
              <div className="mt-6 pt-4 border-t border-slate-50">
                <button 
                  onClick={() => onViewSubmissions(assign.id, assign.title)}
                  className="w-full py-3 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition border border-slate-200"
                >
                  View Submissions
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
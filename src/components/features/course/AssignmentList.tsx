'use client';

import { useState } from 'react';
import { Assignment, AssignmentSubmission } from '@/types';
import { Button } from '@/components/ui/Button';
import { 
  Plus, Calendar, FileText, Trash2, Upload, Eye, CheckCircle, Clock, Download, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { AssignmentService } from '@/lib/services/assignment.service';
import { useSync } from '@/components/providers/SyncProvider';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

interface AssignmentListProps {
  assignments: Assignment[];
  canEdit: boolean;
  isCourseRep: boolean;
  uploading: boolean;
  courseId?: string;
  courseName?: string;
  onDelete: (id: string) => void;
  onSubmit: (e: React.ChangeEvent<HTMLInputElement>, id: string, title: string, desc: string, points: number) => void;
  onViewSubmissions: (id: string, title: string) => void;
  onViewResult: (sub: any, title: string) => void;
  onCreate: () => void;
}

export function AssignmentList({ 
  assignments, 
  canEdit, 
  uploading,
  courseId,
  courseName,
  onDelete,
  onSubmit,
  onViewSubmissions,
  onViewResult,
  onCreate
}: AssignmentListProps) {
  
  const [isExporting, setIsExporting] = useState(false);
  const { isOnline } = useSync();

  // --- Gradebook Export Logic ---
  const handleExportGrades = async () => {
    if (!courseId) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating Gradebook...");

    try {
      const { assignments: courseAssignments, submissions } = await AssignmentService.getCourseGradebook(courseId);

      if (courseAssignments.length === 0) {
        toast.dismiss(toastId);
        toast.error("No assignments found to export.");
        return;
      }

      const studentMap = new Map();

      submissions.forEach((sub: any) => {
        const studentId = sub.student?.id;
        if (!studentId) return;

        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            'Student ID': sub.student.student_id || 'N/A', 
            'Full Name': sub.student.full_name,
            'Email': sub.student.email,
            _scores: {}
          });
        }
        
        const finalScore = sub.lecturer_grade ?? sub.ai_grade ?? 0;
        studentMap.get(studentId)._scores[sub.assignment_id] = finalScore;
      });

      const exportData = Array.from(studentMap.values()).map((student: any) => {
        const row: any = {
          'Student ID': student['Student ID'],
          'Full Name': student['Full Name'],
          'Email': student['Email']
        };

        let totalScore = 0;
        let totalPossible = 0;

        courseAssignments.forEach((assign: any) => {
          const score = student._scores[assign.id] || 0;
          row[assign.title] = score;
          totalScore += score;
          totalPossible += assign.total_points;
        });

        const percentage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
        row['Total Score'] = totalScore;
        row['Percentage'] = `${percentage.toFixed(1)}%`;
        
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const wscols = Object.keys(exportData[0] || {}).map(key => ({ wch: Math.max(key.length, 20) }));
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Grades");

      const safeName = (courseName || 'Course').replace(/[^a-z0-9]/gi, '_');
      XLSX.writeFile(workbook, `${safeName}_Grades_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast.dismiss(toastId);
      toast.success("Gradebook Downloaded!");

    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error("Export Failed");
    } finally {
      setIsExporting(false);
    }
  };

  // --- Wrapper for Submit to Handle Offline ---
  const handleSafeSubmit = async (e: React.ChangeEvent<HTMLInputElement>, id: string, title: string, desc: string, points: number) => {
    if (!e.target.files?.[0]) return;

    if (!isOnline) {
        // 🛑 OFFLINE MODE
        // We can't easily store the PDF in Dexie for sync without bloating it.
        // For MVP, we warn them. For Enterprise, we'd convert to Base64 and store (heavy).
        // Let's implement the Queue logic assuming the backend can handle a delayed blob or we just notify.
        
        toast.warning("You are Offline", { 
            description: "Assignment submissions require internet connection to upload files. Please connect and try again." 
        });
        
        /* // FUTURE: If you want true offline file sync:
        const file = e.target.files[0];
        await db.offlineActions.add({
            type: 'assignment_submission',
            payload: { assignmentId: id, fileData: file, ... }, // Needs complex blob handling
            status: 'pending',
            created_at: new Date().toISOString()
        });
        */
        return;
    }

    // 🟢 ONLINE MODE
    onSubmit(e, id, title, desc, points);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Assignments & Grades
        </h2>
        
        {canEdit && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={handleExportGrades}
              disabled={isExporting}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition disabled:opacity-50 shadow-sm border border-green-700"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export Excel
            </button>

            <Button onClick={onCreate} size="sm" className="flex-1 sm:flex-initial bg-indigo-600">
              <Plus className="w-4 h-4 mr-2" /> Create
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {assignments.length === 0 ? (
           <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
               <FileText className="w-6 h-6 text-slate-300" />
             </div>
             <p className="text-slate-500 font-medium">No assignments yet</p>
           </div>
        ) : (
          assignments.map((assign) => (
            <div key={assign.id} className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{assign.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
                      <Calendar className="w-3 h-3" /> Due {new Date(assign.due_date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {assign.total_points} Pts
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canEdit ? (
                    <>
                      <button 
                        onClick={() => onViewSubmissions(assign.id, assign.title)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-xs font-bold flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                      <button 
                        onClick={() => onDelete(assign.id)}
                        className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    // Student View
                    assign.mySubmission ? (
                       <button 
                         onClick={() => onViewResult(assign.mySubmission, assign.title)}
                         className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold border border-green-100"
                       >
                         {(assign.mySubmission as any).score !== undefined ? (
                           <><CheckCircle className="w-3 h-3" /> Grade: {(assign.mySubmission as any).score}</>
                         ) : (
                           <><Clock className="w-3 h-3" /> Submitted</>
                         )}
                       </button>
                    ) : (
                      <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-sm hover:shadow-md">
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Submit
                        <input 
                          type="file" 
                          accept=".pdf" 
                          className="hidden" 
                          disabled={uploading}
                          onChange={(e) => handleSafeSubmit(e, assign.id, assign.title, assign.description, assign.total_points)}
                        />
                      </label>
                    )
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
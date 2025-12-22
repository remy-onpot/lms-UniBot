import { useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { AssignmentService } from '@/lib/services/assignment.service';
import { supabase } from '@/lib/supabase';

export function useGradebookExport(courseId: string, courseName: string) {
  const [isExporting, setIsExporting] = useState(false);

  // Instantiate Service
  const assignmentService = new AssignmentService(supabase);

  const exportGrades = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Generating Gradebook...");

    try {
      const { assignments, submissions } = await assignmentService.getCourseGradebook(courseId);

      if (assignments.length === 0) {
        toast.error("No assignments found to export.", { id: toastId });
        return;
      }

      // Group Submissions by Student
      const studentMap = new Map();

      submissions.forEach((sub: any) => {
        const studentId = sub.student.id;
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            id: studentId,
            universityId: sub.student.university_id || 'N/A',
            name: sub.student.full_name,
            email: sub.student.email,
            scores: {}
          });
        }
        const finalScore = sub.lecturer_grade ?? sub.ai_grade ?? 0;
        studentMap.get(studentId).scores[sub.assignment_id] = finalScore;
      });

      // Flatten for Excel
      const exportData = Array.from(studentMap.values()).map(student => {
        const row: any = {
          'Student ID': student.universityId,
          'Full Name': student.name,
          'Email': student.email,
        };

        let totalScore = 0;
        let totalPossible = 0;

        // ✅ FIX: Update type to allow 'total_points' to be nullable (number | null)
        assignments.forEach((assign: { id: string; title: string; total_points: number | null }) => {
          const score = student.scores[assign.id] || 0;
          row[assign.title] = score;
          
          totalScore += score;
          // ✅ FIX: Handle null safely with fallback
          totalPossible += (assign.total_points || 0);
        });

        const percentage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
        row['Total Score'] = totalScore;
        row['Percentage'] = `${percentage.toFixed(1)}%`;
        row['Grade'] = percentage >= 70 ? 'A' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 40 ? 'D' : 'F';

        return row;
      });

      // Generate Excel File
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const wscols = Object.keys(exportData[0] || {}).map(key => ({ wch: Math.max(key.length, 20) }));
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Continuous Assessment");

      const fileName = `${courseName.replace(/\s+/g, '_')}_Grades_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success("Gradebook Downloaded!", { id: toastId });

    } catch (error) {
      console.error(error);
      toast.error("Export Failed", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return { exportGrades, isExporting };
}
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { AssignmentService } from '@/lib/services/assignment.service';

export function useGradebookExport(courseId: string, courseName: string) {
  const [isExporting, setIsExporting] = useState(false);

  const exportGrades = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Generating Gradebook...");

    try {
      // 1. Fetch Data
      const { assignments, submissions } = await AssignmentService.getCourseGradebook(courseId);

      if (assignments.length === 0) {
        toast.error("No assignments found to export.", { id: toastId });
        return;
      }

      // 2. Group Submissions by Student
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
        // Store score for this assignment
        // Logic: Use lecturer_grade if available, otherwise ai_grade
        const finalScore = sub.lecturer_grade ?? sub.ai_grade ?? 0;
        studentMap.get(studentId).scores[sub.assignment_id] = finalScore;
      });

      // 3. Flatten for Excel (The "Pivot" Step)
      const exportData = Array.from(studentMap.values()).map(student => {
        const row: any = {
          'Student ID': student.universityId, // Critical for OSIS
          'Full Name': student.name,
          'Email': student.email,
        };

        let totalScore = 0;
        let totalPossible = 0;

        // Add columns for each assignment
        assignments.forEach(assign => {
          const score = student.scores[assign.id] || 0; // Default to 0 if no submission
          row[assign.title] = score;
          
          totalScore += score;
          totalPossible += assign.total_points;
        });

        // Calculate Percentage / Total
        const percentage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
        row['Total Score'] = totalScore;
        row['Percentage'] = `${percentage.toFixed(1)}%`;
        
        // Simple Grading Scale (Adjust for Ghana/UK system)
        row['Grade'] = percentage >= 70 ? 'A' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 40 ? 'D' : 'F';

        return row;
      });

      // 4. Generate Excel File
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-width columns for readability
      const wscols = Object.keys(exportData[0] || {}).map(key => ({ wch: Math.max(key.length, 20) }));
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Continuous Assessment");

      // 5. Download
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
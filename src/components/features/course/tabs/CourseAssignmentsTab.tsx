'use client';

import { useState } from 'react';
import { toast } from 'sonner';
// ✅ FIX 1: Import Supabase Client & Service Class
import { supabase } from '@/lib/supabase';
import { AssignmentService } from '@/lib/services/assignment.service';

import { AssignmentList } from '@/components/features/course/AssignmentList';
import CreateAssignmentModal from '@/components/features/course/modals/CreateAssignmentModal';

interface CourseAssignmentsTabProps {
  courseId: string;
  courseName: string;
  assignments: any[];
  canEdit: boolean;
  isCourseRep: boolean;
  refreshData: () => void;
}

export default function CourseAssignmentsTab({
  courseId,
  courseName,
  assignments,
  canEdit,
  isCourseRep,
  refreshData
}: CourseAssignmentsTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ✅ FIX 2: Create Service Instance
  const assignmentService = new AssignmentService(supabase);

  return (
    <>
      <AssignmentList 
        assignments={assignments} 
        canEdit={canEdit} 
        isCourseRep={isCourseRep}
        uploading={false}
        courseId={courseId}
        courseName={courseName}
        onDelete={async (id) => { 
          if(confirm("Delete assignment?")) { 
            try {
              // ✅ FIX 3: Use instance method
              await assignmentService.delete(id); 
              toast.success("Assignment deleted");
              refreshData(); 
            } catch (e: any) {
              toast.error("Failed to delete", { description: e.message });
            }
          }
        }}
        onSubmit={async (e, id, t, d, p) => { 
            // Submission logic is usually handled inside AssignmentList or here if you prefer
            // For now, keeping your placeholder or previous implementation logic
        }}
        onViewSubmissions={() => {}}
        onViewResult={() => {}}
        onCreate={() => setShowCreateModal(true)}
      />

      {showCreateModal && (
        <CreateAssignmentModal 
          onClose={() => setShowCreateModal(false)} 
          data={{}} 
          processing={false}
          onChange={() => {}} 
          onSubmit={async (e, extendedData) => { 
              try {
                  // ✅ FIX 4: Use instance method 'createAssignment'
                  await assignmentService.createAssignment({         
                       course_id: courseId, // Ensure course_id is passed
                       title: extendedData.title,
                       description: extendedData.description,
                       total_points: extendedData.total_points,
                       due_date: extendedData.due_date,
                       grading_config: extendedData.grading_config
                  });
                  toast.success("Assignment Created!");
                  refreshData();
                  setShowCreateModal(false);
              } catch(err) {
                  console.error(err);
                  toast.error("Failed to create assignment");
              }
          }} 
        />
      )}
    </>
  );
}
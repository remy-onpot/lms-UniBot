'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
            await AssignmentService.delete(id); 
            refreshData(); 
          }
        }}
        onSubmit={async (e, id, t, d, p) => { /* logic handled in hooks */ }}
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
                  await AssignmentService.create(
                      courseId, 
                      {         
                          title: extendedData.title,
                          description: extendedData.description,
                          total_points: extendedData.total_points,
                          due_date: extendedData.due_date,
                          grading_config: extendedData.grading_config
                      }
                  );
                  toast.success("Assignment Created!");
                  refreshData();
                  setShowCreateModal(false);
              } catch(err) {
                  toast.error("Failed to create assignment");
              }
          }} 
        />
      )}
    </>
  );
}
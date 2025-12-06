import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CourseService } from '../lib/services/course.service';
import { AssignmentService } from '../lib/services/assignment.service';
import { supabase } from '../lib/supabase';

// 1. Fetch Course Metadata
export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => CourseService.getById(courseId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!courseId,
  });
}

// 2. Fetch Materials (Handouts)
export function useCourseMaterials(courseId: string) {
  return useQuery({
    queryKey: ['course-materials', courseId],
    queryFn: () => CourseService.getMaterials(courseId),
    staleTime: 5 * 60 * 1000,
    enabled: !!courseId,
  });
}

// 3. Fetch Topics (Curriculum)
export function useCourseTopics(courseId: string) {
  return useQuery({
    queryKey: ['course-topics', courseId],
    queryFn: () => CourseService.getTopics(courseId),
    staleTime: 5 * 60 * 1000,
    enabled: !!courseId,
  });
}

// 4. Fetch Assignments (Dependent on User ID)
export function useCourseAssignments(courseId: string, userId: string | undefined, isStudent: boolean) {
  return useQuery({
    queryKey: ['course-assignments', courseId, userId],
    queryFn: () => CourseService.getAssignments(courseId, userId!, isStudent),
    staleTime: 1 * 60 * 1000, // 1 minute cache for assignments
    enabled: !!courseId && !!userId,
  });
}

// 5. Fetch Announcements (Dependent on Class ID)
export function useCourseAnnouncements(classId: string | undefined) {
  return useQuery({
    queryKey: ['class-announcements', classId],
    queryFn: () => CourseService.getAnnouncements(classId!),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!classId,
  });
}
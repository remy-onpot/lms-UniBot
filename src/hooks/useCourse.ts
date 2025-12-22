import { useQuery } from '@tanstack/react-query';
import { CourseService } from '@/lib/services/course.service';
import { supabase } from '@/lib/supabase';

// Helper to get service instance
const getService = () => new CourseService(supabase);

// 1. Fetch Course Metadata
export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const service = getService();
      return await service.getById(courseId);
    },
    staleTime: 5 * 60 * 1000, 
    enabled: !!courseId,
  });
}

// 2. Fetch Materials (Handouts)
export function useCourseMaterials(courseId: string) {
  return useQuery({
    queryKey: ['course-materials', courseId],
    queryFn: async () => {
      const service = getService();
      return await service.getMaterials(courseId);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!courseId,
  });
}

// 3. Fetch Topics (Curriculum)
export function useCourseTopics(courseId: string) {
  return useQuery({
    queryKey: ['course-topics', courseId],
    queryFn: async () => {
      const service = getService();
      return await service.getTopics(courseId);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!courseId,
  });
}

// 4. Fetch Assignments (Dependent on User ID)
export function useCourseAssignments(courseId: string, userId: string | undefined, isStudent: boolean) {
  return useQuery({
    queryKey: ['course-assignments', courseId, userId],
    queryFn: async () => {
      const service = getService();
      // Ensure strict typing for userId
      if (!userId) throw new Error("User ID required");
      return await service.getAssignments(courseId, userId, isStudent);
    },
    staleTime: 1 * 60 * 1000,
    enabled: !!courseId && !!userId,
  });
}

// 5. Fetch Announcements (Dependent on Class ID)
export function useCourseAnnouncements(classId: string | undefined) {
  return useQuery({
    queryKey: ['class-announcements', classId],
    queryFn: async () => {
        // Since getAnnouncements might be on ClassService or CourseService, 
        // assuming it's on CourseService based on your code.
        // If it's missing on CourseService, you might need to check ClassService.
        const service = getService();
        if (!classId) return [];
        // Note: Ensure getAnnouncements exists on your CourseService class!
        // If it doesn't, you need to add it or use the correct service.
        return (service as any).getAnnouncements ? await (service as any).getAnnouncements(classId) : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!classId,
  });
}
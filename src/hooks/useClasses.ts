import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClassService } from '@/lib/services/class.service';
import { supabase } from '@/lib/supabase';
import { Role } from '@/types';

// 1. Hook to fetch classes
export function useClasses() {
  return useQuery({
    queryKey: ['classes'], // Unique cache key
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // We need the role to know what to fetch
      const { data: profile } = await supabase.from('users').select('role, is_course_rep').eq('id', user.id).single();
      
      return ClassService.getDashboardClasses(user.id, profile?.role as Role, profile?.is_course_rep || false);
    }
  });
}

// 2. Hook to Create a Class
export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      return ClassService.createClass(user.id, data.name, data.description);
    },
    onSuccess: () => {
      // ✅ Automatically refresh the 'classes' list when done
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    }
  });
}

// 3. Hook to Join a Class
export function useJoinClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      return ClassService.joinClass(user.id, code);
    },
    onSuccess: () => {
      // ✅ Refresh classes list immediately
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    }
  });
}
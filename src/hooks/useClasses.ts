import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClassService } from '@/lib/services/class.service';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// 1. Hook to fetch classes
export function useClasses() {
  return useQuery({
    queryKey: ['classes'], // Unique cache key
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const classService = new ClassService(supabase);
      
      // Call instance method (RPC handles role/security internally)
      return await classService.getDashboardClasses();
    }
  });
}

// 2. Hook to Create a Class
export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description: string; access_code: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const classService = new ClassService(supabase);

      return await classService.createClass({
        name: data.name,
        description: data.description, // ✅ Added description to payload
        owner_id: user.id,
        access_code: data.access_code,
        type: 'cohort' // ✅ FIX: Changed 'standard' to 'cohort' to match strict allowed types
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success("Class created successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create class");
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

      const classService = new ClassService(supabase);

      // Call instance method with correct argument order (accessCode, userId)
      return await classService.joinClass(code, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success("Joined class successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to join class");
    }
  });
}
'use server';

import { createClient } from '@/lib/supabase/server';
import { ClassService } from '@/lib/services/class.service';
import { Class } from '@/types';
import { revalidatePath } from 'next/cache';

// --- CLASS ACTIONS ---

export async function createClassAction(data: Partial<Class>) {
  const supabase = await createClient();
  const service = new ClassService(supabase);
  
  try {
    const result = await service.createClass(data);
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function archiveClassAction(classId: string) {
  const supabase = await createClient();
  const service = new ClassService(supabase);
  
  try {
    await service.archiveClass(classId);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateClassAction(classId: string, data: Partial<Class>) {
  const supabase = await createClient();
  const service = new ClassService(supabase);
  
  try {
    const result = await service.updateClass(classId, data);
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
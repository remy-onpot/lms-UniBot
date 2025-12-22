'use server'

import { createClient } from '@/lib/supabase/server';

export async function getAppConfigAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('pricing_config').select('*');
    
  if (error) return {};
  
  // Convert array to object: { 'course_unit_price': 15, ... }
  return data?.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * ✅ STUDENT CALCULATION
 * Usage: calculateStudentPriceAction(4, true) -> Returns discounted price
 */
export async function calculateStudentPriceAction(numCourses: number, isBundle: boolean) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('calculate_student_bill', { 
    num_courses: numCourses, 
    is_bundle: isBundle 
  });

  if (error) {
    console.error('Student calculation failed:', error);
    return 0;
  }
  return data;
}

/**
 * ✅ SAAS CALCULATION (For Lecturers)
 */
export async function calculatePriceAction(planId: string, isAnnual: boolean) {
  const supabase = await createClient();
  // ... (SaaS logic here)
  return 0; 
}
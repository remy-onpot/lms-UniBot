// src/lib/services/billing.service.ts
import { createClient } from "@/lib/supabase/server";
import { COHORT_RULES } from "@/lib/constants";

export const BillingService = {
  
  /**
   * Queries 'student_course_access' table for paid access status.
   * 
   * Access can be granted via:
   * - Single course purchase (course_id matches)
   * - Semester bundle (class_id matches - grants access to ALL courses in class)
   */
  async getStudentAccessStatus(studentId: string, courseId: string, classId: string) {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Check for any valid access record (single course OR bundle)
    const { data: access, error } = await supabase
      .from('student_course_access')
      .select('access_type, expires_at, course_id, class_id')
      .eq('student_id', studentId)
      .or(`course_id.eq.${courseId},class_id.eq.${classId}`)
      .gt('expires_at', now)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
        console.error("Access Check Error:", error);
        return { has_paid_course: false, has_paid_bundle: false, expires_at: null };
    }
    
    if (!access) {
         return { has_paid_course: false, has_paid_bundle: false, expires_at: null };
    }

    return {
      // Single course access: access_type is 'single_course' and matches this specific course
      has_paid_course: access.access_type === 'single_course' && access.course_id === courseId,
      // Bundle access: access_type is 'semester_bundle' or 'full_semester' and matches the class
      has_paid_bundle: ['semester_bundle', 'full_semester'].includes(access.access_type) && access.class_id === classId,
      expires_at: access.expires_at
    };
  },

  async calculateCheckoutPrice(itemType: 'single' | 'bundle', courseIds?: string[]) {
    // 1. Single Course
    if (itemType === 'single') {
        return COHORT_RULES.PRICING.SINGLE_COURSE;
    }

    // 2. Bundle (Dynamic Calculation)
    if (itemType === 'bundle' && courseIds && courseIds.length > 0) {
        const rawTotal = courseIds.length * COHORT_RULES.PRICING.SINGLE_COURSE;
        const discountAmount = rawTotal * COHORT_RULES.PRICING.BUNDLE_DISCOUNT_PERCENT;
        const finalPrice = rawTotal - discountAmount;
        
        return Math.max(0, parseFloat(finalPrice.toFixed(2))); 
    }
    
    return 0;
  },

  async isLecturerSubscriptionActive(userId: string) {
      const supabase = await createClient();
      
      const { data } = await supabase
        .from('users')
        .select('subscription_status, subscription_end_date')
        .eq('id', userId)
        .single();
        
      if (!data) return false;
      
      if (data.subscription_status === 'active') {
         const expiry = new Date(data.subscription_end_date!);
         return expiry > new Date(); 
      }
      
      return false;
  }
};
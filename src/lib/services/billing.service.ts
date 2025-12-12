// src/lib/services/billing.service.ts
import { createClient } from "@/lib/supabase/server";
import { COHORT_RULES } from "@/lib/constants"; // Assuming this file exists

export const BillingService = {
  
  /**
   * REFACTORED: Queries the UNIFIED 'class_enrollments' table for access status.
   */
  async getStudentAccessStatus(studentId: string, courseId: string, classId: string) {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Check enrollment for the class, as access grants class-wide privileges.
    const { data: enrollment, error } = await supabase
      .from('class_enrollments')
      .select('access_type, expires_at, has_paid')
      .eq('student_id', studentId)
      .eq('class_id', classId) 
      .gt('expires_at', now) 
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
        console.error("Access Check Error:", error);
        return { has_paid_course: false, has_paid_bundle: false, expires_at: null };
    }
    
    // Must have an active, paid enrollment record
    if (!enrollment || !enrollment.has_paid) {
         return { has_paid_course: false, has_paid_bundle: false, expires_at: null };
    }

    return {
      has_paid_course: enrollment.access_type === 'single_course',
      has_paid_bundle: enrollment.access_type === 'semester_bundle',
      expires_at: enrollment.expires_at
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
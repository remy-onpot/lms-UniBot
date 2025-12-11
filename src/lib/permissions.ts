// src/lib/permissions.ts
import { COHORT_RULES, SAAS_PLANS, PlanTier, UserRole } from './constants';

interface AccessContext {
  role: UserRole;
  class_type: 'saas' | 'cohort'; 
  has_paid_course?: boolean;
  has_paid_bundle?: boolean;
  week_number?: number;
  is_owner?: boolean;
}

export const Permissions = {
  isContentLocked: (ctx: AccessContext) => {
    // 1. Admins & Owners: Always have access
    // ✅ This comparison is now valid because UserRole includes 'university_admin'
    if (ctx.role === 'university_admin' || ctx.role === 'super_admin') return false;
    if (ctx.role === 'lecturer' && ctx.is_owner) return false;

    // 2. SAAS FIX: Private Lecturers Sponsor their Students
    if (ctx.class_type === 'saas') {
      return false; 
    }

    // 3. COHORT (University): Student Must Pay
    if (ctx.class_type === 'cohort') {
       if (ctx.has_paid_course || ctx.has_paid_bundle) return false;

       // Week 1-2 Free Trial
       if (ctx.week_number && ctx.week_number <= COHORT_RULES.FREE_TRIAL_WEEKS) {
         return false; 
       }
       
       return true; // Locked
    }

    return true; 
  },

  canCreateClass: (currentClassCount: number, tier: PlanTier) => {
    const plan = SAAS_PLANS[tier as keyof typeof SAAS_PLANS] || SAAS_PLANS.starter;
    return currentClassCount < plan.limits.max_classes;
  },

  canAddStudent: (currentStudentCount: number, tier: PlanTier) => {
    const plan = SAAS_PLANS[tier as keyof typeof SAAS_PLANS] || SAAS_PLANS.starter;
    return currentStudentCount < plan.limits.max_students_per_class;
  }
};
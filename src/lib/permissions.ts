import { BUSINESS_LOGIC, PlanType } from './constants';

interface UserContext {
  role: 'student' | 'lecturer';
  plan_tier: PlanType;
  is_course_rep: boolean;
  classes_owned_count: number;
}

export const Permissions = {
  // Can this user create a new class?
  canCreateClass: (ctx: UserContext) => {
    if (ctx.role === 'student' && !ctx.is_course_rep) return false;
    
    if (ctx.is_course_rep) {
      // Reps limited by Cohort rules
      return ctx.classes_owned_count < BUSINESS_LOGIC.COHORT.limits.max_classes;
    }

    // Lecturers limited by Plan
    const limits = BUSINESS_LOGIC.PLANS[ctx.plan_tier].limits;
    return ctx.classes_owned_count < limits.max_classes;
  },

  // Is this specific content locked for this student?
  isContentLocked: (
    classType: 'standard' | 'cohort',
    weekNumber: number,
    hasPaid: boolean
  ) => {
    // 1. Standard Classes (Lecturer Owned) are ALWAYS FREE for students
    if (classType === 'standard') return false;

    // 2. Cohort Classes (Rep Owned) logic
    if (classType === 'cohort') {
      if (hasPaid) return false; // Unlocked via payment
      if (weekNumber <= BUSINESS_LOGIC.COHORT.free_weeks) return false; // Week 1 Hook
      return true; // PAYWALL HIT 🔒
    }

    return false;
  }
};
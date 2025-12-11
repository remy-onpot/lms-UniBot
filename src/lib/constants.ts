// src/lib/constants.ts

export const PDF_EXTRACTION = {
  MAX_CHARS_QUIZ: 15_000,
  MAX_CHARS_GRADING: 25_000,
  MAX_PAGES: 15,
  CHUNK_SIZE: 500,
  CHUNK_OVERLAP: 100,
} as const;

export const AI_LIMITS = {
  QUIZ_MIN_QUESTIONS: 1,
  QUIZ_MAX_QUESTIONS: 20,
  ASSIGNMENT_MIN_LENGTH: 20,
  CHAT_MAX_HISTORY: 50,
} as const;

export const RATE_LIMITS = {
  CHAT: 50,
  QUIZ_GENERATION: 10,
  GRADING: 20,
} as const;

// 🟢 PUBLIC PRICING (Used by UI components like PricingTable)
export const PLANS = {
  starter: {
    name: 'Starter',
    price: 0,
    maxStudents: 50,
    maxClasses: 1,
  },
  pro: {
    name: 'Professional',
    price: 300,
    maxStudents: 500,
    maxClasses: 3,
  },
  elite: {
    name: 'Elite',
    price: 600,
    maxStudents: 2000,
    maxClasses: 20,
  },
} as const;

export const PRICING = {
  SINGLE_COURSE: 15,
  SEMESTER_BUNDLE: 50,
  BUNDLE_DISCOUNT: 0.3,
  QUIZ_RESULTS_UNLOCK: 15,
} as const;

// 🟢 EXPORTED RULES (Used by Permissions & Services)
export const SAAS_PLANS = {
  starter: { 
    label: 'Starter', 
    price: 0, 
    limits: { max_classes: 1, max_students_per_class: 50, ai_grading_credits: 50, can_assign_ta: false } 
  },
  pro: { 
    label: 'Pro', 
    price: 300, 
    limits: { max_classes: 3, max_students_per_class: 500, ai_grading_credits: 300, can_assign_ta: false } 
  },
  elite: { 
    label: 'Elite', 
    price: 600, 
    limits: { max_classes: 20, max_students_per_class: 2000, ai_grading_credits: 2000, can_assign_ta: true } 
  }
} as const;

export const COHORT_RULES = {
  label: 'Cohort Manager',
  FREE_TRIAL_WEEKS: 2, 
  PRICING: {
    SINGLE_COURSE: 15.00, 
    BUNDLE_DISCOUNT_PERCENT: 0.25, // 25% off for Semester Bundle
  },
  SEMESTER_DURATION_MONTHS: 6,
  limits: { 
    max_classes: 1, 
    max_students_per_class: 5000, 
    ai_grading_credits: 0, 
    can_assign_ta: false 
  }
} as const;

// 🟢 AGGREGATE OBJECT (For backward compatibility if needed)
export const BUSINESS_LOGIC = {
  PLANS: SAAS_PLANS,
  COHORT: COHORT_RULES
};

// 🟢 TYPES
export type PlanTier = keyof typeof PLANS;
// ✅ FIX: Added 'university_admin' to solve the permissions comparison error
export type UserRole = 'student' | 'lecturer' | 'university_admin' | 'super_admin';

/**
 * 🛠️ HELPER: Get limits for any user seamlessly
 */
export function getPlanLimits(role: string, planTier: string = 'starter', isCourseRep: boolean = false) {
  if (isCourseRep) {
    return { type: 'cohort', ...COHORT_RULES.limits };
  }
  
  if (role === 'lecturer') {
    // Default to starter if planTier is invalid
    const tier = (planTier in SAAS_PLANS) ? planTier as keyof typeof SAAS_PLANS : 'starter';
    return { type: 'saas', ...SAAS_PLANS[tier].limits };
  }

  return { type: 'student', max_classes: 0, max_students_per_class: 0, ai_grading_credits: 0, can_assign_ta: false };
}
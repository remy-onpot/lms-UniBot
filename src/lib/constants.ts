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

export const PRICING = {
  SINGLE_COURSE: 15, 
  SEMESTER_BUNDLE: 50,
  BUNDLE_DISCOUNT: 0.3,
  QUIZ_RESULTS_UNLOCK: 15,
} as const;

// 🟢 DYNAMIC RATES (The Math)
export const DYNAMIC_RATES = {
  COST_PER_STUDENT_SEAT: 10,   // 10 GHS per student
  AI_CREDITS_PER_SEAT: 10,     
  MIN_SEATS_PURCHASE: 10,
} as const;

// 🟢 STARTER PLAN (Fixed)
export const STARTER_PLAN = {
  label: 'Free Pilot',
  price: 0,
  limits: {
    max_classes: 1,
    max_students_per_class: 10,
    ai_grading_credits: 20,
    can_assign_ta: false
  },
  features: [
    '1 Pilot Class',
    '10 Students Max',
    '20 AI Grading Credits',
    'Community Support'
  ]
} as const;

// 🟢 MARKETING TIERS (Used by UI for display)
// These are "Presets" for the Pricing Table to show examples
export const PLAN_LIMITS = {
  starter: STARTER_PLAN,
  pro: {
    label: 'Pro Tutor',
    price: 300, // Display Price (Example for 30 students)
    limits: {
      max_classes: 5,
      max_students_per_class: 30, // Dynamic
      ai_grading_credits: 300,
      can_assign_ta: false
    },
    features: [
      'Up to 5 Classes',
      'Dynamic Student Seats',
      '10 AI Credits per Seat',
      'Priority Support'
    ]
  },
  elite: {
    label: 'Academy',
    price: 1000, // Display Price (Example for 100 students)
    limits: {
      max_classes: 20,
      max_students_per_class: 100, // Dynamic
      ai_grading_credits: 1000,
      can_assign_ta: true
    },
    features: [
      'Unlimited Classes',
      '100+ Students',
      'TA Management',
      'Dedicated Account Manager'
    ]
  }
} as const;

// 🟢 COHORT RULES
export const COHORT_RULES = {
  label: 'Cohort Manager',
  FREE_TRIAL_WEEKS: 2, 
  limits: { max_classes: 5, max_students_per_class: 5000, ai_grading_credits: 0, can_assign_ta: true }
} as const;

// 🟢 HELPERS
export function calculateSaaSPrice(studentCount: number) {
  if (studentCount <= STARTER_PLAN.limits.max_students_per_class) return 0;
  const count = Math.max(studentCount, DYNAMIC_RATES.MIN_SEATS_PURCHASE);
  return count * DYNAMIC_RATES.COST_PER_STUDENT_SEAT;
}

export function getDynamicLimits(purchasedSeats: number) {
  if (purchasedSeats === 0) return STARTER_PLAN.limits;
  return {
    max_classes: Math.ceil(purchasedSeats / 20),
    max_students_per_class: purchasedSeats,
    ai_grading_credits: purchasedSeats * DYNAMIC_RATES.AI_CREDITS_PER_SEAT,
    can_assign_ta: purchasedSeats >= 100
  };
}

// 🟢 TYPES & EXPORTS
export const BUSINESS_LOGIC = {
  STARTER: STARTER_PLAN,
  RATES: DYNAMIC_RATES,
  COHORT: COHORT_RULES,
  PLANS: PLAN_LIMITS // Backwards compatibility
};

export type PlanTier = keyof typeof PLAN_LIMITS;
export type UserRole = 'student' | 'lecturer' | 'university_admin' | 'super_admin';

export function getPlanLimits(role: string, planTier: string = 'starter', isCourseRep: boolean = false, dynamicSeatCount: number = 0) {
  if (isCourseRep) return { type: 'cohort', ...COHORT_RULES.limits };
  if (role === 'lecturer') {
    if (dynamicSeatCount > 0) return { type: 'dynamic', ...getDynamicLimits(dynamicSeatCount) };
    return { type: 'starter', ...STARTER_PLAN.limits };
  }
  return { type: 'student', max_classes: 0, max_students_per_class: 0, ai_grading_credits: 0, can_assign_ta: false };
}
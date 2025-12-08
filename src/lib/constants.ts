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
    maxClasses: Infinity,
  },
} as const;

export const PRICING = {
  SINGLE_COURSE: 15,
  SEMESTER_BUNDLE: 50,
  BUNDLE_DISCOUNT: 0.3, // 30%
  QUIZ_RESULTS_UNLOCK: 15,
} as const;

export const THEME = {
  COLORS: {
    primary: 'blue-600',
    secondary: 'purple-600',
    success: 'green-600',
    danger: 'red-600',
  },
  BORDER_RADIUS: {
    card: 'rounded-2xl',
    button: 'rounded-xl',
    input: 'rounded-lg',
  },
} as const;
export type PlanType = 'starter' | 'pro' | 'elite';
export type UserRole = 'student' | 'lecturer' | 'super_admin';

export const BUSINESS_LOGIC = {
  // 🏢 SAAS STREAM (Lecturers Paying Subscription)
  PLANS: {
    starter: {
      label: 'Starter',
      price: 0,
      features: ['1 Active Class', '50 Students', 'Basic AI'],
      limits: {
        max_classes: 1,
        max_students_per_class: 50,
        ai_grading_credits: 50, 
        can_assign_ta: false
      }
    },
    pro: {
      label: 'Pro',
      price: 300, // GHS
      features: ['3 Active Classes', '500 Students', 'Advanced AI Grading'],
      limits: {
        max_classes: 3,
        max_students_per_class: 500,
        ai_grading_credits: 300,
        can_assign_ta: false
      }
    },
    elite: {
      label: 'Elite',
      price: 600, // GHS
      features: ['Unlimited Classes', '2000 Students', 'TA Seats'],
      limits: {
        max_classes: 999,
        max_students_per_class: 2000,
        ai_grading_credits: 9999,
        can_assign_ta: true
      }
    }
  },

  // 🎓 COHORT STREAM (Students Paying Reps)
  COHORT: {
    label: 'Cohort Manager',
    free_weeks: 2, 
    pricing: {
      single_course: 15.00, 
      semester_bundle: 50.00
    },
    limits: {
      max_classes: 1, // Reps can only manage 1 cohort
      max_students_per_class: 5000, // Effectively unlimited
      ai_grading_credits: 0, // Reps don't grade
      can_assign_ta: false
    }
  }
};

/**
 * 🛠️ HELPER: Get limits for any user seamlessly
 * This fixes the complexity so your UI doesn't have to guess.
 */
export function getPlanLimits(role: string, planTier: string = 'starter', isCourseRep: boolean = false) {
  // 1. If Course Rep, return Cohort Limits
  if (isCourseRep) {
    return { 
      type: 'cohort', 
      ...BUSINESS_LOGIC.COHORT.limits 
    };
  }

  // 2. If Lecturer, return SaaS Plan Limits
  if (role === 'lecturer') {
    const tier = (planTier in BUSINESS_LOGIC.PLANS) ? planTier as PlanType : 'starter';
    return { 
      type: 'saas', 
      ...BUSINESS_LOGIC.PLANS[tier].limits 
    };
  }

  // 3. Fallback (Students shouldn't be checking this, but safe default)
  return { 
    type: 'student', 
    max_classes: 0, 
    max_students_per_class: 0, 
    ai_grading_credits: 0, 
    can_assign_ta: false 
  };
}
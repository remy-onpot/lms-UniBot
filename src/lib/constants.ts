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
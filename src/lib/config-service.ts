import { createClient } from "@/lib/supabase/server";
import { 
  PLAN_LIMITS as DEFAULT_PLAN_LIMITS, 
  COHORT_RULES as DEFAULT_COHORT_RULES,
  PRICING as DEFAULT_PRICING,
  DYNAMIC_RATES as DEFAULT_DYNAMIC_RATES 
} from "@/lib/constants";

// 1. Define Interfaces based on your Constants structure
// We widen the types from 'as const' literals to general primitives (number, string)
// so that DB overrides work correctly.

interface PricingConfig {
  SINGLE_COURSE: number;
  SEMESTER_BUNDLE: number;
  BUNDLE_DISCOUNT: number;
  QUIZ_RESULTS_UNLOCK: number;
  FLASH_SALE_ACTIVE?: boolean; // Optional dynamic flag
}

interface PlanConfig {
  label: string;
  price: number;
  limits: {
    max_classes: number;
    max_students_per_class: number;
    ai_grading_credits: number;
    can_assign_ta: boolean;
  };
  features: readonly string[] | string[];
}

interface FeatureFlags {
  ENABLE_SHOP: boolean;
  ENABLE_LEADERBOARDS: boolean;
  ENABLE_STREAK_FREEZES: boolean;
  MAX_DAILY_XP: number;
}

// 2. The Main AppConfig Interface
interface AppConfig {
  PRICING: PricingConfig;
  PLAN_LIMITS: Record<string, PlanConfig>; // Allow dynamic keys like 'starter', 'pro'
  COHORT_RULES: typeof DEFAULT_COHORT_RULES;
  DYNAMIC_RATES: typeof DEFAULT_DYNAMIC_RATES;
  FEATURES: FeatureFlags;
}

// 3. Safe Defaults
const DEFAULTS: AppConfig = {
  PRICING: {
    ...DEFAULT_PRICING,
    FLASH_SALE_ACTIVE: false,
  },
  PLAN_LIMITS: DEFAULT_PLAN_LIMITS,
  COHORT_RULES: DEFAULT_COHORT_RULES,
  DYNAMIC_RATES: DEFAULT_DYNAMIC_RATES,
  FEATURES: {
    ENABLE_SHOP: true,
    ENABLE_LEADERBOARDS: true,
    ENABLE_STREAK_FREEZES: true,
    MAX_DAILY_XP: 1000,
  }
};

export const ConfigService = {
  /**
   * Fetches the full application configuration, merging DB overrides on top of defaults.
   */
  async getAppConfig(): Promise<AppConfig> {
    try {
      const supabase = await createClient();
      
      const { data, error } = await supabase.from('app_config').select('key, value');

      if (error || !data) {
        return DEFAULTS;
      }

      // Convert array of rows to a Map
      const dbConfig = data.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {} as Record<string, any>);

      // Merge: Defaults < DB Overrides
      // We use deep merging strategies where appropriate
      return {
        PRICING: { ...DEFAULTS.PRICING, ...(dbConfig['PRICING'] || {}) },
        PLAN_LIMITS: { ...DEFAULTS.PLAN_LIMITS, ...(dbConfig['PLAN_LIMITS'] || {}) },
        COHORT_RULES: { ...DEFAULTS.COHORT_RULES, ...(dbConfig['COHORT_RULES'] || {}) },
        DYNAMIC_RATES: { ...DEFAULTS.DYNAMIC_RATES, ...(dbConfig['DYNAMIC_RATES'] || {}) },
        FEATURES: { ...DEFAULTS.FEATURES, ...(dbConfig['FEATURES'] || {}) },
      };

    } catch (err) {
      console.error("Config Service Critical Failure:", err);
      return DEFAULTS;
    }
  },

  /**
   * Calculates student course pricing.
   * Note: This uses the 'PRICING' object from constants (or DB override).
   */
  async calculateStudentPrice(type: 'single' | 'bundle', courseCount: number = 1): Promise<number> {
    const config = await this.getAppConfig();
    
    // Apply Flash Sale Logic dynamically
    const basePrice = config.PRICING.FLASH_SALE_ACTIVE 
      ? config.PRICING.SINGLE_COURSE * 0.8 // 20% off during flash sale
      : config.PRICING.SINGLE_COURSE;

    if (type === 'single') return parseFloat(basePrice.toFixed(2));

    if (type === 'bundle') {
      // Logic: If buying a bundle, maybe use the SEMESTER_BUNDLE price or a calculated discount?
      // Based on your constants, you have BUNDLE_DISCOUNT (0.3).
      // Let's implement that logic:
      const rawTotal = basePrice * courseCount;
      const discount = rawTotal * config.PRICING.BUNDLE_DISCOUNT;
      return parseFloat((rawTotal - discount).toFixed(2));
    }

    return 0;
  },

  /**
   * Gets specific limits for a lecturer's plan tier.
   */
  async getTierLimits(tier: string) {
    const config = await this.getAppConfig();
    
    // Robust fallback to 'starter' if the tier string is invalid/missing
    const plan = config.PLAN_LIMITS[tier] || config.PLAN_LIMITS['starter'] || DEFAULTS.PLAN_LIMITS['starter'];
    
    return plan.limits;
  },

  async getGamificationSettings() {
    const config = await this.getAppConfig();
    return config.FEATURES;
  }
};
import { createClient } from "@/lib/supabase/server";
import { SAAS_PLANS, COHORT_RULES } from "@/lib/constants";

interface AppConfig {
  PRICING: {
    SINGLE_COURSE: number;
    BUNDLE_DISCOUNT_PERCENT: number;
    FLASH_SALE_ACTIVE?: boolean; 
  };
  SAAS_PLANS: typeof SAAS_PLANS;
  COHORT_RULES: typeof COHORT_RULES;
  FEATURES: {
    ENABLE_SHOP: boolean;
    ENABLE_LEADERBOARDS: boolean;
    ENABLE_STREAK_FREEZES: boolean;
    MAX_DAILY_XP: number;
  };
}

const DEFAULTS: AppConfig = {
  PRICING: {
    SINGLE_COURSE: 15.00,
    BUNDLE_DISCOUNT_PERCENT: 0.25,
    FLASH_SALE_ACTIVE: false,
  },
  SAAS_PLANS: SAAS_PLANS,
  COHORT_RULES: COHORT_RULES,
  FEATURES: {
    ENABLE_SHOP: true,
    ENABLE_LEADERBOARDS: true,
    ENABLE_STREAK_FREEZES: true,
    MAX_DAILY_XP: 1000,
  }
};

export const ConfigService = {
  async getAppConfig(): Promise<AppConfig> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.from('app_config').select('key, value');

      if (error || !data) return DEFAULTS;

      const configMap = data.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {} as any);

      return {
        PRICING: { ...DEFAULTS.PRICING, ...configMap['PRICING'] },
        SAAS_PLANS: { ...DEFAULTS.SAAS_PLANS, ...configMap['SAAS_PLANS'] },
        COHORT_RULES: { ...DEFAULTS.COHORT_RULES, ...configMap['COHORT_RULES'] },
        FEATURES: { ...DEFAULTS.FEATURES, ...configMap['FEATURES'] },
      };

    } catch (err) {
      console.error("Config Service Failure", err);
      return DEFAULTS;
    }
  },

  async calculateStudentPrice(type: 'single' | 'bundle', courseCount: number = 1): Promise<number> {
    const config = await this.getAppConfig();
    
    const basePrice = config.PRICING.FLASH_SALE_ACTIVE 
      ? config.COHORT_RULES.PRICING.SINGLE_COURSE * 0.8 
      : config.COHORT_RULES.PRICING.SINGLE_COURSE;

    if (type === 'single') return parseFloat(basePrice.toFixed(2));

    if (type === 'bundle') {
      const rawTotal = basePrice * courseCount;
      const discount = rawTotal * config.COHORT_RULES.PRICING.BUNDLE_DISCOUNT_PERCENT;
      return parseFloat((rawTotal - discount).toFixed(2));
    }

    return 0;
  },

  async getTierLimits(tier: string) {
    const config = await this.getAppConfig();
    const plan = config.SAAS_PLANS[tier as keyof typeof SAAS_PLANS] || config.SAAS_PLANS.starter;
    return plan.limits;
  },

  async getGamificationSettings() {
    const config = await this.getAppConfig();
    return config.FEATURES;
  }
};
'use server';

import { ConfigService } from '@/lib/config-service';
import { BillingService } from '@/lib/services/billing.service';

/**
 * ⚡ SERVER ACTION: Fetch dynamic config for the client
 * This allows Client Components to know about Flash Sales & Real-time pricing
 */
export async function getAppConfigAction() {
  return await ConfigService.getAppConfig();
}

/**
 * 💰 SERVER ACTION: Calculate exact price securely
 */
export async function calculatePriceAction(type: 'single' | 'bundle', courseIds: string[]) {
  return await BillingService.calculateCheckoutPrice(type, courseIds);
}
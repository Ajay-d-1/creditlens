// src/data/pricing.ts
// Hand-maintainable pricing table for AI vendor subscriptions
// Source: PRICING_DATA.md — verified as of 2026-05-20

import type { VendorPricing } from '../engine/types';

/**
 * Pricing data for AI vendors. Each entry represents the most common
 * individual subscription plan. annualPrice and teamPlanPrice are null
 * when not applicable or not publicly listed.
 *
 * To update: edit this file directly with new pricing data.
 */
export const PRICING_TABLE: VendorPricing[] = [
  {
    vendorId: 'openai',
    monthlyPrice: 20,       // ChatGPT Plus
    annualPrice: 200,        // $200/year (ChatGPT Plus annual)
    teamPlanPrice: 25,       // Team plan per seat
    category: 'chat',
  },
  {
    vendorId: 'anthropic',
    monthlyPrice: 20,        // Claude Pro
    annualPrice: 200,        // Estimated annual
    teamPlanPrice: 25,       // Team plan per seat (min 5 seats)
    category: 'chat',
  },
  {
    vendorId: 'cursor',
    monthlyPrice: 20,        // Cursor Pro
    annualPrice: 192,        // $16/mo billed annually
    teamPlanPrice: 40,       // Business per seat (min 5)
    category: 'coding',
  },
  {
    vendorId: 'github-copilot',
    monthlyPrice: 10,        // Individual
    annualPrice: 100,        // $100/year
    teamPlanPrice: 19,       // Business per seat
    category: 'coding',
  },
  {
    vendorId: 'google-gemini',
    monthlyPrice: 19.99,     // Gemini Pro/Advanced
    annualPrice: 199.99,     // $199.99/year estimate
    teamPlanPrice: null,     // No team plan publicly listed
    category: 'chat',
  },
  {
    vendorId: 'perplexity',
    monthlyPrice: 20,        // Perplexity Pro
    annualPrice: 200,        // $200/year
    teamPlanPrice: null,
    category: 'chat',
  },
  {
    vendorId: 'midjourney',
    monthlyPrice: 10,        // Basic plan
    annualPrice: 96,         // $8/mo billed annually
    teamPlanPrice: null,
    category: 'image',
  },
  {
    vendorId: 'stability',
    monthlyPrice: 10,        // DreamStudio credits
    annualPrice: null,       // Credits-based, no annual
    teamPlanPrice: null,
    category: 'image',
  },
  {
    vendorId: 'elevenlabs',
    monthlyPrice: 5,         // Starter plan
    annualPrice: 48,         // $4/mo billed annually
    teamPlanPrice: null,
    category: 'audio',
  },
  {
    vendorId: 'notion-ai',
    monthlyPrice: 10,        // Notion AI add-on
    annualPrice: 96,         // $8/mo billed annually
    teamPlanPrice: 10,       // Per-member add-on
    category: 'productivity',
  },
  {
    vendorId: 'jasper',
    monthlyPrice: 49,        // Creator plan
    annualPrice: 468,        // $39/mo billed annually
    teamPlanPrice: 125,      // Team plan per seat
    category: 'productivity',
  },
  {
    vendorId: 'copyai',
    monthlyPrice: 49,        // Pro plan
    annualPrice: 432,        // $36/mo billed annually
    teamPlanPrice: null,
    category: 'productivity',
  },
  {
    vendorId: 'runway',
    monthlyPrice: 12,        // Standard plan
    annualPrice: null,       // No annual listed
    teamPlanPrice: null,
    category: 'video',
  },
  {
    vendorId: 'descript',
    monthlyPrice: 24,        // Pro plan
    annualPrice: 264,        // $22/mo billed annually
    teamPlanPrice: 33,       // Business per seat
    category: 'video',
  },
  {
    vendorId: 'replit',
    monthlyPrice: 25,        // Replit Core
    annualPrice: 220,        // Annual pricing
    teamPlanPrice: null,
    category: 'coding',
  },
  {
    vendorId: 'xai',
    monthlyPrice: 8,         // Grok via X Premium+
    annualPrice: null,
    teamPlanPrice: null,
    category: 'chat',
  },
  {
    vendorId: 'suno',
    monthlyPrice: 10,        // Pro plan
    annualPrice: 96,         // $8/mo billed annually
    teamPlanPrice: null,
    category: 'audio',
  },
  {
    vendorId: 'pika',
    monthlyPrice: 8,         // Standard plan
    annualPrice: null,
    teamPlanPrice: null,
    category: 'video',
  },
  {
    vendorId: 'windsurf',
    monthlyPrice: 10,        // Windsurf Pro
    annualPrice: null,       // No annual listed
    teamPlanPrice: 20,       // Teams per seat
    category: 'coding',
  },
  {
    vendorId: 'cohere',
    monthlyPrice: 0,         // API usage-based
    annualPrice: null,
    teamPlanPrice: null,
    category: 'api',
  },
];

/**
 * Lookup pricing by vendorId.
 */
export function getPricing(vendorId: string): VendorPricing | undefined {
  return PRICING_TABLE.find((p) => p.vendorId === vendorId);
}

/**
 * Build a Map for O(1) lookups.
 */
export function buildPricingMap(): Map<string, VendorPricing> {
  const map = new Map<string, VendorPricing>();
  for (const entry of PRICING_TABLE) {
    map.set(entry.vendorId, entry);
  }
  return map;
}

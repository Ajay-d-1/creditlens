// src/engine/vendorMatcher.ts
// Merchant name normalization and AI-vendor matching from bank/card statement lines

import type { VendorMatch, VendorRule } from './types';

/**
 * Normalize a raw merchant/description string from a bank statement.
 * - Uppercase
 * - Strip card-network noise: POS, WWW., *, #, trailing digits/reference codes
 * - Collapse multiple spaces
 */
export function normalizeMerchant(raw: string): string {
  let s = raw.toUpperCase();

  // Remove common card-network prefixes
  s = s.replace(/^(POS|POS\s+|PURCHASE\s+|RECURRING\s+|INTERNET\s+|ONLINE\s+|DEBIT\s+|PAYMENT\s+TO\s+)/i, '');

  // Remove PAYPAL * prefix (keep what's after)
  s = s.replace(/^PAYPAL\s*\*\s*/i, '');

  // Remove WWW. prefix
  s = s.replace(/WWW\./g, '');

  // Remove asterisks and hash signs
  s = s.replace(/[*#]/g, ' ');

  // Remove trailing reference codes (sequences of digits/letters after the merchant name)
  // e.g., "CURSOR.COM 8821" → "CURSOR.COM", "OPENAI CHATGPT SUBSCR CA" → "OPENAI CHATGPT SUBSCR CA"
  s = s.replace(/\s+[A-Z0-9]{4,}$/g, '');

  // Remove trailing country/state codes (2-letter codes at end)
  s = s.replace(/\s+[A-Z]{2}\s*$/g, '');

  // Remove trailing purely-numeric sequences
  s = s.replace(/\s+\d+\s*$/g, '');

  // Remove common suffixes
  s = s.replace(/\s+(SUBSCR|SUBSCRIPTION|SUB|MONTHLY|ANNUAL|RECURRING|PAYMENT|INC|LLC|LTD|CORP)\.?\s*$/g, '');

  // Collapse multiple spaces
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Ordered rules table for matching normalized merchant strings to known AI vendors.
 * First match wins. Patterns are tested against the normalized (uppercased, cleaned) string.
 */
export const VENDOR_RULES: VendorRule[] = [
  // 1. OpenAI / ChatGPT
  {
    pattern: /OPENAI|CHATGPT|CHAT\s*GPT/,
    vendorId: 'openai',
    displayName: 'OpenAI / ChatGPT',
    category: 'chat',
  },
  // 2. Anthropic / Claude
  {
    pattern: /ANTHROPIC|CLAUDE/,
    vendorId: 'anthropic',
    displayName: 'Anthropic / Claude',
    category: 'chat',
  },
  // 3. Cursor
  {
    pattern: /CURSOR/,
    vendorId: 'cursor',
    displayName: 'Cursor',
    category: 'coding',
  },
  // 4. GitHub Copilot
  {
    pattern: /GITHUB\s*\.?\s*COM\s*COPILO|GITHUB\s+COPILOT|COPILOT/,
    vendorId: 'github-copilot',
    displayName: 'GitHub Copilot',
    category: 'coding',
  },
  // 5. Google Gemini
  {
    pattern: /GEMINI|GOOGLE\s*(ONE|AI|DEEPMIND)/,
    vendorId: 'google-gemini',
    displayName: 'Google Gemini',
    category: 'chat',
  },
  // 6. Perplexity
  {
    pattern: /PERPLEXITY/,
    vendorId: 'perplexity',
    displayName: 'Perplexity',
    category: 'chat',
  },
  // 7. Midjourney
  {
    pattern: /MIDJOURNEY|MID\s*JOURNEY/,
    vendorId: 'midjourney',
    displayName: 'Midjourney',
    category: 'image',
  },
  // 8. Stability AI
  {
    pattern: /STABILITY\s*(AI)?|STABLE\s*DIFFUSION|DREAMSTUDIO/,
    vendorId: 'stability',
    displayName: 'Stability AI',
    category: 'image',
  },
  // 9. ElevenLabs
  {
    pattern: /ELEVENLABS|ELEVEN\s*LABS/,
    vendorId: 'elevenlabs',
    displayName: 'ElevenLabs',
    category: 'audio',
  },
  // 10. Notion AI
  {
    pattern: /NOTION/,
    vendorId: 'notion-ai',
    displayName: 'Notion AI',
    category: 'productivity',
  },
  // 11. Jasper
  {
    pattern: /JASPER/,
    vendorId: 'jasper',
    displayName: 'Jasper',
    category: 'productivity',
  },
  // 12. Copy.ai
  {
    pattern: /COPY\.?\s*AI/,
    vendorId: 'copyai',
    displayName: 'Copy.ai',
    category: 'productivity',
  },
  // 13. Runway
  {
    pattern: /RUNWAY/,
    vendorId: 'runway',
    displayName: 'Runway',
    category: 'video',
  },
  // 14. Descript
  {
    pattern: /DESCRIPT/,
    vendorId: 'descript',
    displayName: 'Descript',
    category: 'video',
  },
  // 15. Replit
  {
    pattern: /REPLIT/,
    vendorId: 'replit',
    displayName: 'Replit',
    category: 'coding',
  },
  // 16. xAI / Grok
  {
    pattern: /XAI|X\.AI|GROK/,
    vendorId: 'xai',
    displayName: 'xAI / Grok',
    category: 'chat',
  },
  // 17. Suno
  {
    pattern: /SUNO/,
    vendorId: 'suno',
    displayName: 'Suno',
    category: 'audio',
  },
  // 18. Pika
  {
    pattern: /PIKA/,
    vendorId: 'pika',
    displayName: 'Pika',
    category: 'video',
  },
  // 19. Windsurf / Codeium
  {
    pattern: /WINDSURF|CODEIUM/,
    vendorId: 'windsurf',
    displayName: 'Windsurf',
    category: 'coding',
  },
  // 20. Cohere
  {
    pattern: /COHERE/,
    vendorId: 'cohere',
    displayName: 'Cohere',
    category: 'api',
  },
];

/**
 * Match a normalized merchant string against the vendor rules table.
 * Returns the first matching vendor or null if no match.
 */
export function matchVendor(normalized: string): VendorMatch | null {
  for (const rule of VENDOR_RULES) {
    if (rule.pattern.test(normalized)) {
      return {
        vendorId: rule.vendorId,
        displayName: rule.displayName,
        category: rule.category,
      };
    }
  }
  return null;
}

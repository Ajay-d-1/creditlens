// src/demo/sampleData.ts
// Seeded generator producing 6 months of realistic transactions for Northwind AI (15 seats)

import type { ParsedTransaction } from '../engine/types';

export const SAMPLE_COMPANY_NAME = 'Northwind AI';
export const SAMPLE_TEAM_SIZE = 15;

/**
 * Simple mulberry32 deterministic PRNG so sample data generation
 * is identical on every call.
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate 6 months of deterministic sample transactions (Jan 2026 – Jun 2026)
 * specifically designed to trigger at least 5 audit findings:
 * 1. Duplicate Chat Subscriptions (Claude Pro + 4x ChatGPT Plus)
 * 2. Personal-to-Team Consolidation attempt (4x ChatGPT Plus charges)
 * 3. Price Increase (Midjourney jumping $30 -> $35 -> $45 -> $60)
 * 4. Monthly-to-Annual (Cursor Pro recurring monthly @ $100/mo)
 * 5. Spend Anomaly (Cohere API spiking from ~$50 to $450 in May)
 * 6. Benchmark Overspend (Total spend exceeding $1,170/mo threshold for 15 seats)
 */
export function generateSampleTransactions(): ParsedTransaction[] {
  const rand = mulberry32(123456);
  const rows: ParsedTransaction[] = [];

  const months = [
    { ym: '2026-01', days: 31 },
    { ym: '2026-02', days: 28 },
    { ym: '2026-03', days: 31 },
    { ym: '2026-04', days: 30 },
    { ym: '2026-05', days: 31 },
    { ym: '2026-06', days: 30 },
  ];

  const makeRow = (date: string, description: string, amount: number): ParsedTransaction => ({
    date,
    description,
    amount,
    rawRow: { Date: date, Description: description, Amount: amount.toFixed(2) },
  });

  months.forEach((m, idx) => {
    // 1. 4 separate ChatGPT Plus charges ($20 each) on different days
    rows.push(makeRow(`${m.ym}-03`, 'OPENAI *CHATGPT PLUS CA', 20.0));
    rows.push(makeRow(`${m.ym}-08`, 'OPENAI *CHATGPT PLUS CA', 20.0));
    rows.push(makeRow(`${m.ym}-15`, 'OPENAI *CHATGPT PLUS CA', 20.0));
    rows.push(makeRow(`${m.ym}-22`, 'OPENAI *CHATGPT PLUS CA', 20.0));

    // 2. Both Claude Pro AND ChatGPT subscriptions active (Duplicate Chat)
    rows.push(makeRow(`${m.ym}-05`, 'ANTHROPIC *CLAUDE PRO', 20.0));

    // 3. Midjourney price increase ($30 -> $35 -> $45 -> $60)
    let mjAmount = 30.0;
    if (idx === 2) mjAmount = 35.0;      // March: +16.6%
    else if (idx === 3) mjAmount = 45.0; // April: +28.5%
    else if (idx >= 4) mjAmount = 60.0;  // May-Jun: +33.3%
    rows.push(makeRow(`${m.ym}-12`, 'MIDJOURNEY SUBSCRIPTION', mjAmount));

    // 4. Cursor Pro monthly billing ($100/mo = 5 seats @ $20/mo) -> monthly-to-annual
    rows.push(makeRow(`${m.ym}-01`, 'CURSOR.COM PRO BILLING', 100.0));

    // 5. Cohere API anomaly (averaging $50, spiking to $450 in May)
    let cohereAmount = 50.0 + (rand() * 4 - 2); // ~$48-$52
    if (idx === 4) cohereAmount = 450.0; // May spike
    rows.push(makeRow(`${m.ym}-28`, 'COHERE API PLATFORM USAGE', Math.round(cohereAmount * 100) / 100));

    // 6. Additional team spend to ensure total exceeds $1,170/mo benchmark midpoint for 15 seats
    rows.push(makeRow(`${m.ym}-10`, 'GITHUB.COM COPILOT BUSINESS', 285.0)); // 15 seats @ $19
    rows.push(makeRow(`${m.ym}-14`, 'JASPER AI TEAM SUBSCRIPTION', 400.0));
    rows.push(makeRow(`${m.ym}-18`, 'ELEVENLABS CREATOR PLAN', 300.0));

    // Add some random noise transactions (non-AI / unmatched) for realism
    if (rand() > 0.3) {
      rows.push(makeRow(`${m.ym}-04`, 'AMZN MKTP US*123456789', Math.round((25 + rand() * 150) * 100) / 100));
    }
    if (rand() > 0.5) {
      rows.push(makeRow(`${m.ym}-19`, 'UBER *TRIP HELP.UBER.COM', Math.round((18 + rand() * 45) * 100) / 100));
    }
  });

  // Sort chronologically
  rows.sort((a, b) => a.date.localeCompare(b.date));

  return rows;
}

// src/engine/findings.test.ts
import { describe, it, expect } from 'vitest';
import {
  detectDuplicateChats,
  detectTeamConsolidation,
  detectPriceIncrease,
  detectSpendAnomaly,
  detectMonthlyToAnnual,
  detectBenchmarkOverspend,
  detectPlanPriceMismatch,
  generateFindings,
} from './findings';
import type { AggregatedVendor, VendorPricing, BenchmarkBand } from './types';

// ── Test Helpers ──

function makeVendor(
  vendorId: string,
  displayName: string,
  category: AggregatedVendor['category'],
  monthlyAmounts: Record<string, number>,
  planName?: string,
  seatCount?: number
): AggregatedVendor {
  return { vendorId, displayName, category, monthlyAmounts, planName, seatCount };
}

function makePricingMap(entries: VendorPricing[]): Map<string, VendorPricing> {
  const map = new Map<string, VendorPricing>();
  for (const e of entries) {
    map.set(e.vendorId, e);
  }
  return map;
}

const testBands: BenchmarkBand[] = [
  { minTeamSize: 1, maxTeamSize: 1, midpointPerSeatMonth: 100, label: 'Solo' },
  { minTeamSize: 2, maxTeamSize: 5, midpointPerSeatMonth: 80, label: 'Small Team' },
  { minTeamSize: 6, maxTeamSize: 20, midpointPerSeatMonth: 60, label: 'Mid-size Team' },
];

// ══════════════════════════════════════════════
//  Rule 1: Duplicate Chat Subscriptions
// ══════════════════════════════════════════════

describe('detectDuplicateChats', () => {
  it('detects overlapping chat vendors in the same month', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI / ChatGPT', 'chat', { '2026-01': 20 }),
      makeVendor('anthropic', 'Anthropic / Claude', 'chat', { '2026-01': 20 }),
    ];

    const findings = detectDuplicateChats(vendors, new Map());

    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('duplicate-chat-subscriptions');
    expect(findings[0].confidence).toBe(0.5);
    expect(findings[0].monthlySavings).toBe(20); // Savings = the more expensive one
  });

  it('returns empty when only one chat vendor', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI / ChatGPT', 'chat', { '2026-01': 20 }),
      makeVendor('cursor', 'Cursor', 'coding', { '2026-01': 20 }),
    ];

    const findings = detectDuplicateChats(vendors, new Map());
    expect(findings).toHaveLength(0);
  });

  it('ignores months where only one chat vendor is active', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', { '2026-01': 20 }),
      makeVendor('anthropic', 'Anthropic', 'chat', { '2026-02': 20 }),
    ];

    const findings = detectDuplicateChats(vendors, new Map());
    expect(findings).toHaveLength(0);
  });

  it('picks cheapest vendor to keep', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', { '2026-01': 20 }),
      makeVendor('anthropic', 'Anthropic', 'chat', { '2026-01': 100 }),
      makeVendor('perplexity', 'Perplexity', 'chat', { '2026-01': 20 }),
    ];

    const findings = detectDuplicateChats(vendors, new Map());

    expect(findings).toHaveLength(1);
    expect(findings[0].evidence['cheapestVendor']).toBe('OpenAI');
    // Savings = 100 + 20 = 120 (sum of non-cheapest)
    expect(findings[0].monthlySavings).toBe(120);
  });
});

// ══════════════════════════════════════════════
//  Rule 2: Personal to Team Consolidation
// ══════════════════════════════════════════════

describe('detectTeamConsolidation', () => {
  it('skips when team plan is more expensive per seat than individual', () => {
    // 3 × $20 = $60, team: 3 × $25 = $75 → no savings
    const vendors = [
      makeVendor('openai', 'OpenAI / ChatGPT', 'chat', { '2026-01': 60 }),
    ];
    const pricingMap = makePricingMap([
      { vendorId: 'openai', monthlyPrice: 20, annualPrice: null, teamPlanPrice: 25, category: 'chat' },
    ]);

    const findings = detectTeamConsolidation(vendors, pricingMap);
    expect(findings).toHaveLength(0);
  });

  it('correctly calculates savings when team plan is cheaper per seat', () => {
    const vendors = [
      makeVendor('cursor', 'Cursor', 'coding', { '2026-01': 100 }), // 5 × $20
    ];
    const pricingMap = makePricingMap([
      { vendorId: 'cursor', monthlyPrice: 20, annualPrice: null, teamPlanPrice: 15, category: 'coding' },
    ]);

    const findings = detectTeamConsolidation(vendors, pricingMap);

    expect(findings).toHaveLength(1);
    // 5 × $20 = $100, team: 5 × $15 = $75, savings = $25
    expect(findings[0].monthlySavings).toBe(25);
  });

  it('skips when no team plan available', () => {
    const vendors = [
      makeVendor('perplexity', 'Perplexity', 'chat', { '2026-01': 60 }),
    ];
    const pricingMap = makePricingMap([
      { vendorId: 'perplexity', monthlyPrice: 20, annualPrice: null, teamPlanPrice: null, category: 'chat' },
    ]);

    const findings = detectTeamConsolidation(vendors, pricingMap);
    expect(findings).toHaveLength(0);
  });

  it('skips when fewer than 3 estimated seats', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', { '2026-01': 40 }), // 2 × $20
    ];
    const pricingMap = makePricingMap([
      { vendorId: 'openai', monthlyPrice: 20, annualPrice: null, teamPlanPrice: 15, category: 'chat' },
    ]);

    const findings = detectTeamConsolidation(vendors, pricingMap);
    expect(findings).toHaveLength(0);
  });

  it('skips when vendor not in pricing table', () => {
    const vendors = [
      makeVendor('unknown', 'Unknown Vendor', 'chat', { '2026-01': 100 }),
    ];

    const findings = detectTeamConsolidation(vendors, new Map());
    expect(findings).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════
//  Rule 3: Price Increase Detection
// ══════════════════════════════════════════════

describe('detectPriceIncrease', () => {
  it('detects 2+ consecutive >10% MoM increases', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', {
        '2026-01': 20,
        '2026-02': 24,  // +20%
        '2026-03': 30,  // +25%
      }),
    ];

    const findings = detectPriceIncrease(vendors);

    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('price-increase');
    expect(findings[0].monthlySavings).toBe(0); // alert only
    expect(findings[0].severity).toBe('medium');
  });

  it('does not fire for single increase', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', {
        '2026-01': 20,
        '2026-02': 24,  // +20%
        '2026-03': 24,  // 0% — breaks the streak
      }),
    ];

    const findings = detectPriceIncrease(vendors);
    expect(findings).toHaveLength(0);
  });

  it('does not fire for <10% increases', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', {
        '2026-01': 100,
        '2026-02': 105,  // +5%
        '2026-03': 110,  // +4.8%
      }),
    ];

    const findings = detectPriceIncrease(vendors);
    expect(findings).toHaveLength(0);
  });

  it('requires at least 3 months of data', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', {
        '2026-01': 20,
        '2026-02': 30,
      }),
    ];

    const findings = detectPriceIncrease(vendors);
    expect(findings).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════
//  Rule 4: Spend Anomaly Detection
// ══════════════════════════════════════════════

describe('detectSpendAnomaly', () => {
  it('detects spend spike > mean + 2.5 * stddev', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', {
        '2026-01': 20,
        '2026-02': 20,
        '2026-03': 20,
        '2026-04': 200, // 10× spike
      }),
    ];

    const findings = detectSpendAnomaly(vendors);

    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('spend-anomaly');
    expect(findings[0].monthlySavings).toBe(0);
  });

  it('does not fire for normal variance', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', {
        '2026-01': 20,
        '2026-02': 22,
        '2026-03': 18,
        '2026-04': 21,
      }),
    ];

    const findings = detectSpendAnomaly(vendors);
    expect(findings).toHaveLength(0);
  });

  it('requires 4+ months of data', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', {
        '2026-01': 20,
        '2026-02': 20,
        '2026-03': 200,
      }),
    ];

    const findings = detectSpendAnomaly(vendors);
    expect(findings).toHaveLength(0);
  });

  it('handles zero spend months gracefully', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', {
        '2026-01': 0,
        '2026-02': 0,
        '2026-03': 0,
        '2026-04': 20,
      }),
    ];

    // All trailing are 0, stddev is 0, so anomaly should not fire
    // (stddev === 0 guard applies)
    const findings = detectSpendAnomaly(vendors);
    expect(findings).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════
//  Rule 5: Monthly to Annual Conversion
// ══════════════════════════════════════════════

describe('detectMonthlyToAnnual', () => {
  it('suggests annual billing when savings exist', () => {
    const vendors = [
      makeVendor('cursor', 'Cursor', 'coding', {
        '2026-01': 20,
        '2026-02': 20,
        '2026-03': 20,
      }),
    ];
    const pricingMap = makePricingMap([
      { vendorId: 'cursor', monthlyPrice: 20, annualPrice: 192, teamPlanPrice: null, category: 'coding' },
    ]);

    const findings = detectMonthlyToAnnual(vendors, pricingMap);

    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('monthly-to-annual');
    expect(findings[0].confidence).toBe(0.9);
    // 12 × $20 = $240, annual = $192, savings = $48
    expect(findings[0].evidence['annualSavings']).toBe(48);
    expect(findings[0].monthlySavings).toBe(4); // $48/12
  });

  it('skips when no annual price available', () => {
    const vendors = [
      makeVendor('runway', 'Runway', 'video', {
        '2026-01': 12,
        '2026-02': 12,
      }),
    ];
    const pricingMap = makePricingMap([
      { vendorId: 'runway', monthlyPrice: 12, annualPrice: null, teamPlanPrice: null, category: 'video' },
    ]);

    const findings = detectMonthlyToAnnual(vendors, pricingMap);
    expect(findings).toHaveLength(0);
  });

  it('skips when only 1 month of data', () => {
    const vendors = [
      makeVendor('cursor', 'Cursor', 'coding', { '2026-01': 20 }),
    ];
    const pricingMap = makePricingMap([
      { vendorId: 'cursor', monthlyPrice: 20, annualPrice: 192, teamPlanPrice: null, category: 'coding' },
    ]);

    const findings = detectMonthlyToAnnual(vendors, pricingMap);
    expect(findings).toHaveLength(0);
  });

  it('skips when spend does not match known monthly price', () => {
    // If someone pays $200/mo for a $20/mo tool, something else is going on
    const vendors = [
      makeVendor('cursor', 'Cursor', 'coding', {
        '2026-01': 200,
        '2026-02': 200,
      }),
    ];
    const pricingMap = makePricingMap([
      { vendorId: 'cursor', monthlyPrice: 20, annualPrice: 192, teamPlanPrice: null, category: 'coding' },
    ]);

    const findings = detectMonthlyToAnnual(vendors, pricingMap);
    expect(findings).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════
//  Rule 6: Benchmark Overspend
// ══════════════════════════════════════════════

describe('detectBenchmarkOverspend', () => {
  it('flags spend >30% above band midpoint', () => {
    // Solo user spending $200/mo — midpoint is $100, so 100% above
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', { '2026-01': 200 }),
    ];

    const findings = detectBenchmarkOverspend(vendors, 1, testBands);

    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('benchmark-overspend');
    expect(findings[0].evidence['percentAbove']).toBe(100);
  });

  it('does not flag spend within 30% of midpoint', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', { '2026-01': 120 }),
    ];

    const findings = detectBenchmarkOverspend(vendors, 1, testBands);
    expect(findings).toHaveLength(0);
  });

  it('handles team size correctly', () => {
    // 5-person team spending $600/mo total = $120/seat
    // Small team midpoint is $80, 130% = $104
    // $120 > $104, so should flag
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', { '2026-01': 300 }),
      makeVendor('cursor', 'Cursor', 'coding', { '2026-01': 300 }),
    ];

    const findings = detectBenchmarkOverspend(vendors, 5, testBands);
    expect(findings).toHaveLength(1);
  });

  it('returns empty for zero team size', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', { '2026-01': 200 }),
    ];

    const findings = detectBenchmarkOverspend(vendors, 0, testBands);
    expect(findings).toHaveLength(0);
  });

  it('returns empty for no vendors', () => {
    const findings = detectBenchmarkOverspend([], 1, testBands);
    expect(findings).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════
//  Rule 7: Plan-Price Mismatch
// ══════════════════════════════════════════════

describe('Rule 7: detectPlanPriceMismatch', () => {
  it('flags free hobby plan with paid spend ($0 vs paid)', () => {
    const vendors = [
      makeVendor('cursor', 'Cursor', 'coding', { '2026-01': 30 }, 'Hobby', 1),
    ];
    const pricingMap = makePricingMap([
      { vendorId: 'cursor', monthlyPrice: 20, annualPrice: 192, teamPlanPrice: 40, category: 'coding' },
    ]);

    const findings = detectPlanPriceMismatch(vendors, pricingMap);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('plan-price-mismatch');
    expect(findings[0].title).toContain('Hobby');
    expect(findings[0].monthlySavings).toBe(30);
  });

  it('flags exaggerated price per seat above 20% tolerance', () => {
    const vendors = [
      makeVendor('anthropic', 'Claude Pro', 'chat', { '2026-01': 400 }, 'Pro', 10),
    ];
    const pricingMap = makePricingMap([
      { vendorId: 'anthropic', monthlyPrice: 20, annualPrice: 200, teamPlanPrice: 25, category: 'chat' },
    ]);

    // Expected: $20 * 10 seats = $200. Actual = $400 (200% above expected, well above 20% tolerance)
    const findings = detectPlanPriceMismatch(vendors, pricingMap);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe('plan-price-mismatch');
    expect(findings[0].monthlySavings).toBe(200); // 400 - 200
  });

  it('does not flag when spend is within 20% tolerance', () => {
    const vendors = [
      makeVendor('anthropic', 'Claude Pro', 'chat', { '2026-01': 22 }, 'Pro', 1),
    ];
    const pricingMap = makePricingMap([
      { vendorId: 'anthropic', monthlyPrice: 20, annualPrice: 200, teamPlanPrice: 25, category: 'chat' },
    ]);

    // $22 vs expected $20 (10% over, within 20% tolerance)
    const findings = detectPlanPriceMismatch(vendors, pricingMap);
    expect(findings).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════
//  Integration: generateFindings
// ══════════════════════════════════════════════

describe('generateFindings', () => {
  it('computes totals correctly', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', { '2026-01': 20, '2026-02': 20 }),
      makeVendor('cursor', 'Cursor', 'coding', { '2026-01': 20, '2026-02': 20 }),
    ];

    const result = generateFindings({
      vendors,
      pricingMap: new Map(),
      benchmarkBands: testBands,
      teamSize: 1,
    });

    expect(result.totalMonthlySpend).toBe(40); // Latest month: 20 + 20
    expect(result.totalAnnualSpend).toBe(480);
  });

  it('de-duplicates savings by vendor', () => {
    // Set up a vendor that triggers both monthly-to-annual AND team consolidation
    const vendors = [
      makeVendor('cursor', 'Cursor', 'coding', {
        '2026-01': 20,
        '2026-02': 20,
        '2026-03': 20,
      }),
    ];

    const pricingMap = makePricingMap([
      { vendorId: 'cursor', monthlyPrice: 20, annualPrice: 192, teamPlanPrice: 15, category: 'coding' },
    ]);

    const result = generateFindings({
      vendors,
      pricingMap,
      benchmarkBands: [],
      teamSize: 1,
    });

    // Monthly-to-annual saves $4/mo. No team consolidation trigger (only 1 seat).
    // potentialMonthlySavings should be the MAX savings per vendor, not the SUM
    const cursorFindings = result.findings.filter(
      (f) => f.evidence['vendorId'] === 'cursor'
    );
    const maxSavings = Math.max(...cursorFindings.map((f) => f.monthlySavings));
    expect(result.potentialMonthlySavings).toBe(maxSavings);
  });

  it('generates vendor forecasts', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', {
        '2026-01': 20,
        '2026-02': 20,
        '2026-03': 20,
      }),
    ];

    const result = generateFindings({
      vendors,
      pricingMap: new Map(),
      benchmarkBands: [],
      teamSize: 1,
    });

    expect(result.vendorForecasts).toHaveLength(1);
    expect(result.vendorForecasts[0].vendorId).toBe('openai');
    expect(result.vendorForecasts[0].trend).toBe('stable');
  });

  it('handles empty vendors gracefully', () => {
    const result = generateFindings({
      vendors: [],
      pricingMap: new Map(),
      benchmarkBands: testBands,
      teamSize: 1,
    });

    expect(result.findings).toHaveLength(0);
    expect(result.totalMonthlySpend).toBe(0);
    expect(result.potentialMonthlySavings).toBe(0);
    expect(result.vendorForecasts).toHaveLength(0);
  });

  it('handles missing pricing entries gracefully', () => {
    const vendors = [
      makeVendor('unknown-vendor', 'Mystery Tool', 'chat', { '2026-01': 100 }),
    ];

    const result = generateFindings({
      vendors,
      pricingMap: new Map(),
      benchmarkBands: testBands,
      teamSize: 1,
    });

    // Should not crash — just skip rules that need pricing
    expect(result.totalMonthlySpend).toBe(100);
  });

  // Snapshot test: full end-to-end aggregate → findings result
  it('snapshot: full audit result shape', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI / ChatGPT', 'chat', {
        '2026-01': 20, '2026-02': 20, '2026-03': 20, '2026-04': 20,
      }),
      makeVendor('anthropic', 'Anthropic / Claude', 'chat', {
        '2026-01': 20, '2026-02': 20, '2026-03': 20, '2026-04': 20,
      }),
      makeVendor('cursor', 'Cursor', 'coding', {
        '2026-01': 20, '2026-02': 20, '2026-03': 20, '2026-04': 20,
      }),
    ];

    const pricingMap = makePricingMap([
      { vendorId: 'openai', monthlyPrice: 20, annualPrice: 200, teamPlanPrice: 25, category: 'chat' },
      { vendorId: 'anthropic', monthlyPrice: 20, annualPrice: 200, teamPlanPrice: 25, category: 'chat' },
      { vendorId: 'cursor', monthlyPrice: 20, annualPrice: 192, teamPlanPrice: 40, category: 'coding' },
    ]);

    const result = generateFindings({
      vendors,
      pricingMap,
      benchmarkBands: testBands,
      teamSize: 1,
    });

    // Validate shape — not exact values (those depend on rule execution order)
    expect(result).toHaveProperty('findings');
    expect(result).toHaveProperty('totalMonthlySpend');
    expect(result).toHaveProperty('totalAnnualSpend');
    expect(result).toHaveProperty('potentialMonthlySavings');
    expect(result).toHaveProperty('vendorForecasts');

    expect(Array.isArray(result.findings)).toBe(true);
    expect(Array.isArray(result.vendorForecasts)).toBe(true);
    expect(result.totalMonthlySpend).toBe(60);
    expect(result.totalAnnualSpend).toBe(720);

    // Should have at least duplicate-chat finding
    const dupChat = result.findings.find((f) => f.type === 'duplicate-chat-subscriptions');
    expect(dupChat).toBeDefined();

    // Should have monthly-to-annual findings
    const annualFindings = result.findings.filter((f) => f.type === 'monthly-to-annual');
    expect(annualFindings.length).toBeGreaterThan(0);

    // Every finding has the correct shape
    for (const finding of result.findings) {
      expect(finding).toHaveProperty('id');
      expect(finding).toHaveProperty('type');
      expect(finding).toHaveProperty('title');
      expect(finding).toHaveProperty('severity');
      expect(finding).toHaveProperty('monthlySavings');
      expect(finding).toHaveProperty('annualSavings');
      expect(finding).toHaveProperty('confidence');
      expect(finding).toHaveProperty('evidence');
      expect(typeof finding.confidence).toBe('number');
      expect(finding.confidence).toBeGreaterThanOrEqual(0);
      expect(finding.confidence).toBeLessThanOrEqual(1);
    }

    // Vendor forecasts for all 3 vendors
    expect(result.vendorForecasts).toHaveLength(3);

    // Snapshot the structure (not values)
    expect(result).toMatchSnapshot();
  });

  it('single month of data: limited findings', () => {
    const vendors = [
      makeVendor('openai', 'OpenAI', 'chat', { '2026-01': 20 }),
      makeVendor('anthropic', 'Anthropic', 'chat', { '2026-01': 20 }),
    ];

    const result = generateFindings({
      vendors,
      pricingMap: new Map(),
      benchmarkBands: testBands,
      teamSize: 1,
    });

    // Only duplicate-chat should fire (doesn't need multi-month data)
    const priceIncrease = result.findings.filter((f) => f.type === 'price-increase');
    expect(priceIncrease).toHaveLength(0);

    const anomaly = result.findings.filter((f) => f.type === 'spend-anomaly');
    expect(anomaly).toHaveLength(0);
  });
});

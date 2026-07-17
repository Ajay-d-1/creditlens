import { describe, it, expect } from 'vitest';
import { generateSampleTransactions, SAMPLE_TEAM_SIZE } from './sampleData';
import { aggregateTransactions } from '../engine/aggregate';
import { matchVendor } from '../engine/vendorMatcher';
import { generateFindings } from '../engine/findings';
import { buildPricingMap } from '../data/pricing';
import { BENCHMARK_BANDS } from '../data/benchmarks';

describe('sampleData Generator & Pipeline Verification', () => {
  it('deterministically generates 6 months of transactions producing at least 5 findings', () => {
    const rows = generateSampleTransactions();
    expect(rows.length).toBeGreaterThan(30);

    const agg = aggregateTransactions(rows, matchVendor);
    expect(agg.vendors.length).toBeGreaterThanOrEqual(8);

    const pricingMap = buildPricingMap();
    const result = generateFindings({
      vendors: agg.vendors,
      pricingMap,
      benchmarkBands: BENCHMARK_BANDS,
      teamSize: SAMPLE_TEAM_SIZE,
    });

    expect(result.findings.length).toBeGreaterThanOrEqual(5);

    const findingTypes = new Set(result.findings.map((f) => f.type));
    expect(findingTypes.has('duplicate-chat-subscriptions')).toBe(true);
    expect(findingTypes.has('price-increase')).toBe(true);
    expect(findingTypes.has('monthly-to-annual')).toBe(true);
    expect(findingTypes.has('spend-anomaly')).toBe(true);
    expect(findingTypes.has('benchmark-overspend')).toBe(true);

    // Verify forecasts are generated for all matched vendors
    expect(result.vendorForecasts.length).toBe(agg.vendors.length);
  });
});

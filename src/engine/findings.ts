// src/engine/findings.ts
// Deterministic findings engine — 6 rules for AI spend optimization
// Each rule is a pure function that can be independently tested.

import type {
  Finding,
  FindingType,
  AggregatedVendor,
  AuditResult,
  VendorPricing,
  VendorForecast,
  BenchmarkBand,
} from './types';
import { forecastVendor } from './forecast';

// ── Helpers ──

let findingCounter = 0;

function createFinding(
  type: FindingType,
  title: string,
  severity: Finding['severity'],
  monthlySavings: number,
  confidence: number,
  evidence: Record<string, number | string>
): Finding {
  findingCounter++;
  return {
    id: `${type}-${findingCounter}`,
    type,
    title,
    severity,
    monthlySavings,
    annualSavings: monthlySavings * 12,
    confidence,
    evidence,
  };
}

/**
 * Get all months where a vendor has spend, sorted chronologically.
 */
function getActiveMonths(vendor: AggregatedVendor): string[] {
  return Object.keys(vendor.monthlyAmounts).sort();
}

/**
 * Compute mean of an array of numbers.
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Compute standard deviation of an array of numbers.
 */
function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
}

// ══════════════════════════════════════════════
//  RULE 1: Duplicate Chat Subscriptions
// ══════════════════════════════════════════════

/**
 * More than one 'chat' category vendor active in the same month.
 * Suggest keeping the cheapest; savings = sum of the rest; confidence 0.5.
 */
export function detectDuplicateChats(
  vendors: AggregatedVendor[],
  pricingMap: Map<string, VendorPricing>
): Finding[] {
  const chatVendors = vendors.filter((v) => v.category === 'chat');
  if (chatVendors.length < 2) return [];

  // Find months where 2+ chat vendors overlap
  const allMonths = new Set<string>();
  for (const v of chatVendors) {
    for (const month of Object.keys(v.monthlyAmounts)) {
      allMonths.add(month);
    }
  }

  const findings: Finding[] = [];

  for (const month of allMonths) {
    const activeInMonth = chatVendors.filter(
      (v) => v.monthlyAmounts[month] !== undefined && v.monthlyAmounts[month] > 0
    );
    if (activeInMonth.length < 2) continue;

    // Sort by monthly cost in that month — cheapest first
    activeInMonth.sort((a, b) => a.monthlyAmounts[month] - b.monthlyAmounts[month]);

    const cheapest = activeInMonth[0];
    const rest = activeInMonth.slice(1);
    const savings = rest.reduce((sum, v) => sum + v.monthlyAmounts[month], 0);

    findings.push(
      createFinding(
        'duplicate-chat-subscriptions',
        `Overlapping chat subscriptions in ${month}`,
        savings > 30 ? 'high' : 'medium',
        savings,
        0.5,
        {
          month,
          activeCount: activeInMonth.length,
          cheapestVendor: cheapest.displayName,
          cheapestAmount: cheapest.monthlyAmounts[month],
          duplicateVendors: rest.map((v) => v.displayName).join(', '),
          duplicateTotal: savings,
        }
      )
    );

    // Only report for the most recent overlapping month to avoid noise
    break;
  }

  return findings;
}

// ══════════════════════════════════════════════
//  RULE 2: Personal to Team Consolidation
// ══════════════════════════════════════════════

/**
 * 3+ separate same-vendor charges in one month where pricing table
 * has a teamPlanPrice → savings vs team plan; confidence 0.8.
 */
export function detectTeamConsolidation(
  vendors: AggregatedVendor[],
  pricingMap: Map<string, VendorPricing>,
  _rawTransactionCounts?: Map<string, Map<string, number>> // vendorId → month → count
): Finding[] {
  const findings: Finding[] = [];

  // We infer multiple seats from the aggregate amount vs monthly price
  for (const vendor of vendors) {
    const pricing = pricingMap.get(vendor.vendorId);
    if (!pricing || pricing.teamPlanPrice === null || pricing.monthlyPrice <= 0) continue;

    for (const [month, amount] of Object.entries(vendor.monthlyAmounts)) {
      // Estimate number of individual subscriptions
      const estimatedSeats = Math.round(amount / pricing.monthlyPrice);
      if (estimatedSeats < 3) continue;

      const teamCost = estimatedSeats * pricing.teamPlanPrice;
      const savings = amount - teamCost;

      if (savings > 0) {
        findings.push(
          createFinding(
            'personal-to-team-consolidation',
            `${vendor.displayName}: consolidate ${estimatedSeats} seats to team plan`,
            savings > 50 ? 'high' : 'medium',
            savings,
            0.8,
            {
              vendorId: vendor.vendorId,
              vendor: vendor.displayName,
              month,
              estimatedSeats,
              currentMonthly: amount,
              teamPlanCost: teamCost,
              perSeatSavings: Math.round((pricing.monthlyPrice - pricing.teamPlanPrice) * 100) / 100,
            }
          )
        );

        // Only report first qualifying month per vendor
        break;
      }
    }
  }

  return findings;
}

// ══════════════════════════════════════════════
//  RULE 3: Price Increase Detection
// ══════════════════════════════════════════════

/**
 * Same vendor amount up >10% MoM for 2+ consecutive months.
 * Savings = 0 (alert only), severity medium.
 */
export function detectPriceIncrease(vendors: AggregatedVendor[]): Finding[] {
  const findings: Finding[] = [];

  for (const vendor of vendors) {
    const months = getActiveMonths(vendor);
    if (months.length < 3) continue; // Need 3+ months to detect 2+ consecutive increases

    let consecutiveIncreases = 0;
    let streakStartMonth = '';

    for (let i = 1; i < months.length; i++) {
      const prevAmount = vendor.monthlyAmounts[months[i - 1]];
      const currAmount = vendor.monthlyAmounts[months[i]];

      if (prevAmount > 0 && currAmount > prevAmount) {
        const pctIncrease = ((currAmount - prevAmount) / prevAmount) * 100;
        if (pctIncrease > 10) {
          consecutiveIncreases++;
          if (consecutiveIncreases === 1) {
            streakStartMonth = months[i - 1];
          }
        } else {
          consecutiveIncreases = 0;
        }
      } else {
        consecutiveIncreases = 0;
      }

      if (consecutiveIncreases >= 2) {
        const firstAmount = vendor.monthlyAmounts[streakStartMonth];
        const lastAmount = currAmount;
        const totalIncrease = lastAmount - firstAmount;

        findings.push(
          createFinding(
            'price-increase',
            `${vendor.displayName}: price increasing for ${consecutiveIncreases + 1} months`,
            'medium',
            0, // alert only
            0.7,
            {
              vendorId: vendor.vendorId,
              vendor: vendor.displayName,
              streakStartMonth,
              streakEndMonth: months[i],
              startAmount: firstAmount,
              endAmount: lastAmount,
              totalIncrease,
              consecutiveMonths: consecutiveIncreases + 1,
            }
          )
        );

        break; // One finding per vendor
      }
    }
  }

  return findings;
}

// ══════════════════════════════════════════════
//  RULE 4: Spend Anomaly Detection
// ══════════════════════════════════════════════

/**
 * Vendor month amount > mean + 2.5 * stddev over trailing months.
 * Requires 4+ months of data. Alert only, savings = 0.
 */
export function detectSpendAnomaly(vendors: AggregatedVendor[]): Finding[] {
  const findings: Finding[] = [];

  for (const vendor of vendors) {
    const months = getActiveMonths(vendor);
    if (months.length < 4) continue;

    // Check each month (starting from the 4th) against trailing history
    for (let i = 3; i < months.length; i++) {
      const trailingValues = months.slice(0, i).map((m) => vendor.monthlyAmounts[m]);
      const currentAmount = vendor.monthlyAmounts[months[i]];
      const trailingMean = mean(trailingValues);
      const trailingStddev = stddev(trailingValues);

      // When stddev is 0 (all identical trailing values), use a minimum floor
      // so a large spike (e.g., 10× the mean) is still flagged
      const effectiveStddev = trailingStddev > 0 ? trailingStddev : trailingMean * 0.2;
      const threshold = trailingMean + 2.5 * effectiveStddev;

      if (effectiveStddev > 0 && currentAmount > threshold) {
        findings.push(
          createFinding(
            'spend-anomaly',
            `${vendor.displayName}: unusual spend in ${months[i]}`,
            'medium',
            0,
            0.6,
            {
              vendorId: vendor.vendorId,
              vendor: vendor.displayName,
              anomalyMonth: months[i],
              amount: currentAmount,
              trailingMean: Math.round(trailingMean * 100) / 100,
              trailingStddev: Math.round(trailingStddev * 100) / 100,
              threshold: Math.round(threshold * 100) / 100,
            }
          )
        );

        break; // One finding per vendor
      }
    }
  }

  return findings;
}

// ══════════════════════════════════════════════
//  RULE 5: Monthly to Annual Conversion
// ══════════════════════════════════════════════

/**
 * Vendor billed monthly and pricing table has an annualPrice.
 * Savings = 12 * monthly - annualPrice; confidence 0.9.
 */
export function detectMonthlyToAnnual(
  vendors: AggregatedVendor[],
  pricingMap: Map<string, VendorPricing>
): Finding[] {
  const findings: Finding[] = [];

  for (const vendor of vendors) {
    const pricing = pricingMap.get(vendor.vendorId);
    if (!pricing || pricing.annualPrice === null || pricing.monthlyPrice <= 0) continue;

    const months = getActiveMonths(vendor);
    if (months.length < 2) continue; // Need evidence of recurring monthly billing

    // Check if the amount is consistent with monthly billing
    const amounts = months.map((m) => vendor.monthlyAmounts[m]);
    const avgMonthly = mean(amounts);

    // Only flag if average monthly is close to the known monthly price
    // (within 50% tolerance to account for usage variations)
    if (avgMonthly < pricing.monthlyPrice * 0.5 || avgMonthly > pricing.monthlyPrice * 2) {
      continue;
    }

    const annualIfMonthly = avgMonthly * 12;
    const savings = annualIfMonthly - pricing.annualPrice;

    if (savings > 0) {
      findings.push(
        createFinding(
          'monthly-to-annual',
          `${vendor.displayName}: switch to annual billing`,
          savings > 50 ? 'high' : savings > 20 ? 'medium' : 'low',
          Math.round((savings / 12) * 100) / 100, // Monthly equivalent savings
          0.9,
          {
            vendorId: vendor.vendorId,
            vendor: vendor.displayName,
            avgMonthlySpend: Math.round(avgMonthly * 100) / 100,
            annualIfMonthly: Math.round(annualIfMonthly * 100) / 100,
            annualPlanPrice: pricing.annualPrice,
            annualSavings: Math.round(savings * 100) / 100,
            monthsOfData: months.length,
          }
        )
      );
    }
  }

  return findings;
}

// ══════════════════════════════════════════════
//  RULE 6: Benchmark Overspend
// ══════════════════════════════════════════════

/**
 * Total $/seat/month vs benchmark band; flag if >30% above midpoint.
 */
export function detectBenchmarkOverspend(
  vendors: AggregatedVendor[],
  teamSize: number,
  benchmarkBands: BenchmarkBand[]
): Finding[] {
  if (teamSize <= 0 || vendors.length === 0) return [];

  const band = benchmarkBands.find(
    (b) => teamSize >= b.minTeamSize && teamSize <= b.maxTeamSize
  );
  if (!band) return [];

  // Calculate total monthly spend across all vendors (most recent month)
  const allMonths = new Set<string>();
  for (const v of vendors) {
    for (const m of Object.keys(v.monthlyAmounts)) {
      allMonths.add(m);
    }
  }
  const sortedMonths = Array.from(allMonths).sort();
  const latestMonth = sortedMonths[sortedMonths.length - 1];
  if (!latestMonth) return [];

  let totalSpend = 0;
  for (const v of vendors) {
    totalSpend += v.monthlyAmounts[latestMonth] || 0;
  }

  const perSeatSpend = totalSpend / teamSize;
  const threshold = band.midpointPerSeatMonth * 1.3; // 30% above midpoint

  if (perSeatSpend > threshold) {
    return [
      createFinding(
        'benchmark-overspend',
        `AI spend per seat is ${Math.round((perSeatSpend / band.midpointPerSeatMonth - 1) * 100)}% above ${band.label} benchmark`,
        perSeatSpend > band.midpointPerSeatMonth * 2 ? 'high' : 'medium',
        0, // Alert only — no concrete savings number
        0.6,
        {
          teamSize,
          band: band.label,
          benchmarkMidpoint: band.midpointPerSeatMonth,
          actualPerSeat: Math.round(perSeatSpend * 100) / 100,
          totalMonthlySpend: totalSpend,
          month: latestMonth,
          percentAbove: Math.round((perSeatSpend / band.midpointPerSeatMonth - 1) * 100),
        }
      ),
    ];
  }

  return [];
}

// ══════════════════════════════════════════════
//  RULE 7: Plan-Price Mismatch
// ══════════════════════════════════════════════

export function detectPlanPriceMismatch(
  vendors: AggregatedVendor[],
  pricingMap: Map<string, VendorPricing>
): Finding[] {
  const findings: Finding[] = [];

  for (const vendor of vendors) {
    const pricing = pricingMap.get(vendor.vendorId);
    if (!pricing) continue;

    const months = getActiveMonths(vendor);
    if (months.length === 0) continue;
    const latestMonth = months[months.length - 1];
    const amount = vendor.monthlyAmounts[latestMonth];

    // Special case: free plans with spend (e.g., Cursor Hobby or any plan with 'hobby'/'free')
    const planLower = vendor.planName ? vendor.planName.toLowerCase() : '';
    if ((planLower === 'hobby' || planLower === 'free') && amount > 0) {
      findings.push(
        createFinding(
          'plan-price-mismatch',
          `${vendor.displayName}: paying $${amount}/mo on free ${vendor.planName || 'Hobby'} plan`,
          'high',
          amount,
          0.95,
          {
            vendorId: vendor.vendorId,
            vendor: vendor.displayName,
            plan: vendor.planName || vendor.category,
            actualAmount: amount,
            expectedAmount: 0,
            overpayPerMonth: amount,
            overpayPercent: 100,
          }
        )
      );
      continue;
    }

    // Check against expected price per seat if seatCount is provided (or default 1 seat)
    const seats = vendor.seatCount && vendor.seatCount > 0 ? vendor.seatCount : 1;
    const basePrice =
      (planLower === 'team' || planLower === 'business' || planLower === 'teams') && pricing.teamPlanPrice
        ? pricing.teamPlanPrice
        : pricing.monthlyPrice;

    if (basePrice <= 0) continue; // e.g. usage based

    const expected = basePrice * seats;
    const tolerance = expected * 1.2; // 20% over is acceptable

    if (amount > tolerance) {
      const overpay = amount - expected;
      findings.push(
        createFinding(
          'plan-price-mismatch',
          `${vendor.displayName}: paying ${Math.round((amount / expected) * 100)}% above listed price ($${Math.round(amount / seats)}/seat vs $${basePrice}/seat)`,
          'high',
          overpay,
          0.9,
          {
            vendorId: vendor.vendorId,
            vendor: vendor.displayName,
            plan: vendor.planName || vendor.category,
            actualAmount: amount,
            expectedAmount: expected,
            overpayPerMonth: overpay,
            overpayPercent: Math.round(((amount - expected) / expected) * 100),
          }
        )
      );
    }
  }

  return findings;
}

// ══════════════════════════════════════════════
//  MAIN: Generate All Findings
// ══════════════════════════════════════════════

export interface GenerateFindingsInput {
  vendors: AggregatedVendor[];
  pricingMap: Map<string, VendorPricing>;
  benchmarkBands: BenchmarkBand[];
  teamSize: number;
}

/**
 * Run all 7 finding rules against the aggregated vendor data.
 * Returns de-duplicated findings and computed totals.
 */
export function generateFindings(input: GenerateFindingsInput): AuditResult {
  // Reset counter for deterministic IDs in tests
  findingCounter = 0;

  const { vendors, pricingMap, benchmarkBands, teamSize } = input;

  // Run all rules
  const allFindings: Finding[] = [
    ...detectDuplicateChats(vendors, pricingMap),
    ...detectTeamConsolidation(vendors, pricingMap),
    ...detectPriceIncrease(vendors),
    ...detectSpendAnomaly(vendors),
    ...detectMonthlyToAnnual(vendors, pricingMap),
    ...detectBenchmarkOverspend(vendors, teamSize, benchmarkBands),
    ...detectPlanPriceMismatch(vendors, pricingMap),
  ];

  // Compute totals
  const allMonths = new Set<string>();
  for (const v of vendors) {
    for (const m of Object.keys(v.monthlyAmounts)) {
      allMonths.add(m);
    }
  }

  let totalMonthlySpend = 0;
  const sortedMonths = Array.from(allMonths).sort();
  const latestMonth = sortedMonths[sortedMonths.length - 1];
  if (latestMonth) {
    for (const v of vendors) {
      totalMonthlySpend += v.monthlyAmounts[latestMonth] || 0;
    }
  }

  const totalAnnualSpend = totalMonthlySpend * 12;

  // De-duplicate savings by vendor: for each vendorId, keep max savings
  // This prevents double-counting when multiple rules fire for the same vendor
  const savingsByVendor = new Map<string, number>();
  for (const finding of allFindings) {
    if (finding.monthlySavings > 0) {
      const vendorId =
        typeof finding.evidence['vendorId'] === 'string'
          ? finding.evidence['vendorId']
          : finding.id; // fallback for cross-vendor findings
      const current = savingsByVendor.get(vendorId) || 0;
      savingsByVendor.set(vendorId, Math.max(current, finding.monthlySavings));
    }
  }

  const potentialMonthlySavings = Array.from(savingsByVendor.values()).reduce(
    (sum, v) => sum + v,
    0
  );

  // Generate forecasts for all vendors
  const vendorForecasts: VendorForecast[] = vendors.map((v) =>
    forecastVendor(v.vendorId, v.monthlyAmounts)
  );

  return {
    findings: allFindings,
    totalMonthlySpend,
    totalAnnualSpend,
    potentialMonthlySavings,
    vendorForecasts,
  };
}

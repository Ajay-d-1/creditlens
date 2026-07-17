// src/engine/types.ts
// Shared type definitions for the CreditLens engine layer

// ── Vendor Matching ──

export type VendorCategory =
  | 'chat'
  | 'coding'
  | 'api'
  | 'image'
  | 'audio'
  | 'video'
  | 'productivity';

export interface VendorMatch {
  vendorId: string;
  displayName: string;
  category: VendorCategory;
}

export interface VendorRule {
  pattern: RegExp;
  vendorId: string;
  displayName: string;
  category: VendorCategory;
}

// ── CSV Parsing ──

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  rawRow: Record<string, string>;
}

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
}

// ── Aggregation ──

export interface AggregatedVendor {
  vendorId: string;
  displayName: string;
  category: VendorCategory;
  monthlyAmounts: Record<string, number>; // "2026-01" → total
  planName?: string;
  seatCount?: number;
}

export interface AggregationResult {
  vendors: AggregatedVendor[];
  unmatchedRows: ParsedTransaction[];
  totalMatched: number;
  totalRows: number;
  transactionCounts?: Map<string, Map<string, number>>; // vendorId -> month -> count
}

// ── Findings Engine ──

export type FindingType =
  | 'duplicate-chat-subscriptions'
  | 'personal-to-team-consolidation'
  | 'price-increase'
  | 'spend-anomaly'
  | 'monthly-to-annual'
  | 'benchmark-overspend'
  | 'plan-price-mismatch'
  | 'shadow-spending';

export interface Finding {
  id: string;
  type: FindingType;
  title: string;
  severity: 'high' | 'medium' | 'low';
  monthlySavings: number;
  annualSavings: number;
  confidence: number; // 0..1
  evidence: Record<string, number | string>;
}

export interface AuditResult {
  findings: Finding[];
  totalMonthlySpend: number;
  totalAnnualSpend: number;
  potentialMonthlySavings: number; // de-duplicated by vendor
  vendorForecasts: VendorForecast[];
}

// ── Pricing Data ──

export interface VendorPricing {
  vendorId: string;
  monthlyPrice: number;
  annualPrice: number | null;
  teamPlanPrice: number | null;
  category: VendorCategory;
}

// ── Benchmarks ──

export interface BenchmarkBand {
  minTeamSize: number;
  maxTeamSize: number;
  midpointPerSeatMonth: number;
  label: string;
}

// ── Forecasting ──

export interface VendorForecast {
  vendorId: string;
  predictedAmounts: Record<string, number>; // "2026-04" → predicted $
  trend: 'increasing' | 'decreasing' | 'stable';
  slope: number; // $/month change
}

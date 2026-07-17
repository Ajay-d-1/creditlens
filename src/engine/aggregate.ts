// src/engine/aggregate.ts
// Aggregate parsed transactions into vendor-level monthly summaries

import type {
  ParsedTransaction,
  AggregatedVendor,
  AggregationResult,
  VendorMatch,
} from './types';
import { parseDateToMonth } from './csvParser';

/**
 * Aggregate parsed CSV transactions into vendor-level monthly spend summaries.
 *
 * @param rows - Parsed transaction rows from CSV
 * @param matcher - Vendor matching function (normalizeMerchant + matchVendor)
 * @returns Vendors with monthly amounts, plus unmatched rows and coverage stats
 */
export function aggregateTransactions(
  rows: ParsedTransaction[],
  matcher: (description: string) => VendorMatch | null
): AggregationResult {
  const vendorMap = new Map<
    string,
    {
      vendorId: string;
      displayName: string;
      category: VendorMatch['category'];
      monthlyAmounts: Record<string, number>;
    }
  >();
  const transactionCounts = new Map<string, Map<string, number>>();

  const unmatchedRows: ParsedTransaction[] = [];
  let totalMatched = 0;

  for (const row of rows) {
    const match = matcher(row.description);

    if (!match) {
      unmatchedRows.push(row);
      continue;
    }

    totalMatched++;

    const month = parseDateToMonth(row.date);
    if (!month) {
      // If we can't parse the date, still count as matched but skip aggregation
      continue;
    }

    if (!transactionCounts.has(match.vendorId)) {
      transactionCounts.set(match.vendorId, new Map<string, number>());
    }
    const monthMap = transactionCounts.get(match.vendorId)!;
    monthMap.set(month, (monthMap.get(month) || 0) + 1);

    const existing = vendorMap.get(match.vendorId);
    if (existing) {
      existing.monthlyAmounts[month] =
        (existing.monthlyAmounts[month] || 0) + row.amount;
    } else {
      vendorMap.set(match.vendorId, {
        vendorId: match.vendorId,
        displayName: match.displayName,
        category: match.category,
        monthlyAmounts: { [month]: row.amount },
      });
    }
  }

  const vendors: AggregatedVendor[] = Array.from(vendorMap.values()).sort(
    (a, b) => {
      // Sort by total spend descending
      const totalA = Object.values(a.monthlyAmounts).reduce((s, v) => s + v, 0);
      const totalB = Object.values(b.monthlyAmounts).reduce((s, v) => s + v, 0);
      return totalB - totalA;
    }
  );

  return {
    vendors,
    unmatchedRows,
    totalMatched,
    totalRows: rows.length,
    transactionCounts,
  };
}

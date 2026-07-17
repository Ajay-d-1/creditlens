// src/engine/forecast.ts
// Simple linear regression forecasting for vendor spend trends

import type { VendorForecast } from './types';

/**
 * Compute simple linear regression: y = slope * x + intercept
 * x values are indices (0, 1, 2, ...), y values are spend amounts.
 */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Increment a YYYY-MM string by one month.
 */
function nextMonth(yyyyMM: string): string {
  const [yearStr, monthStr] = yyyyMM.split('-');
  let year = parseInt(yearStr);
  let month = parseInt(monthStr);
  month++;
  if (month > 12) {
    month = 1;
    year++;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Forecast future spend for a vendor using simple linear regression.
 *
 * @param vendorId - Vendor identifier
 * @param monthlyAmounts - Historical monthly amounts (keys: "YYYY-MM", values: dollars)
 * @param forecastMonths - Number of months to forecast ahead (default 3)
 * @returns Forecast with predicted amounts, trend direction, and slope
 */
export function forecastVendor(
  vendorId: string,
  monthlyAmounts: Record<string, number>,
  forecastMonths: number = 3
): VendorForecast {
  // Sort months chronologically
  const sortedMonths = Object.keys(monthlyAmounts).sort();
  const values = sortedMonths.map((m) => monthlyAmounts[m]);

  const { slope, intercept } = linearRegression(values);

  // Determine trend
  let trend: VendorForecast['trend'];
  const threshold = 0.5; // $/month change threshold for "stable"
  if (slope > threshold) {
    trend = 'increasing';
  } else if (slope < -threshold) {
    trend = 'decreasing';
  } else {
    trend = 'stable';
  }

  // Generate forecasted amounts
  const predictedAmounts: Record<string, number> = {};
  const n = values.length;
  let lastMonth = sortedMonths[sortedMonths.length - 1] || '2026-01';

  for (let i = 0; i < forecastMonths; i++) {
    lastMonth = nextMonth(lastMonth);
    const predicted = intercept + slope * (n + i);
    // Floor at 0 — can't have negative spend
    predictedAmounts[lastMonth] = Math.max(0, Math.round(predicted * 100) / 100);
  }

  return {
    vendorId,
    predictedAmounts,
    trend,
    slope: Math.round(slope * 100) / 100,
  };
}

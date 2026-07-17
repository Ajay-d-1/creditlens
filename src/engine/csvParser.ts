// src/engine/csvParser.ts
// Column auto-detection for bank/card statement CSV files

import type { ColumnMapping } from './types';

/** Common header variants for date columns */
const DATE_VARIANTS = [
  'date',
  'transaction date',
  'trans date',
  'posting date',
  'txn date',
  'value date',
  'settlement date',
  'posted date',
  'trade date',
];

/** Common header variants for description/merchant columns */
const DESCRIPTION_VARIANTS = [
  'description',
  'narration',
  'merchant',
  'payee',
  'transaction description',
  'details',
  'particulars',
  'merchant name',
  'name',
  'memo',
  'reference',
  'transaction details',
];

/** Common header variants for amount columns */
const AMOUNT_VARIANTS = [
  'amount',
  'debit',
  'debit amount',
  'transaction amount',
  'withdrawal',
  'value',
  'charge',
  'total',
  'payment',
  'debit/credit',
];

/**
 * Normalize a header string for comparison: lowercase, trim, collapse spaces.
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Find the best matching header from a list of variants.
 * Returns the original header name (not normalized) or null.
 */
function findMatch(headers: string[], variants: string[]): string | null {
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    if (variants.includes(normalized)) {
      return header;
    }
  }
  return null;
}

/**
 * Auto-detect column mappings from CSV headers.
 * Returns a ColumnMapping if all three columns (date, description, amount) are confidently detected.
 * Returns null if detection is ambiguous (caller should show column-mapping UI).
 */
export function detectColumns(headers: string[]): ColumnMapping | null {
  const dateCol = findMatch(headers, DATE_VARIANTS);
  const descCol = findMatch(headers, DESCRIPTION_VARIANTS);
  const amountCol = findMatch(headers, AMOUNT_VARIANTS);

  // All three must be detected for auto-mapping
  if (dateCol && descCol && amountCol) {
    return {
      date: dateCol,
      description: descCol,
      amount: amountCol,
    };
  }

  return null;
}

/**
 * Parse an amount string from a bank statement.
 * Handles: "$1,234.56", "(100.00)" (negative), "-50.00", "1234.56", etc.
 * Returns the absolute value (all statement amounts are treated as spend).
 */
export function parseAmount(raw: string): number {
  if (!raw || raw.trim() === '') return 0;

  let s = raw.trim();

  // Check if it's a negative/debit in parentheses format: (100.00)
  const isParenNeg = s.startsWith('(') && s.endsWith(')');
  if (isParenNeg) {
    s = s.slice(1, -1);
  }

  // Remove currency symbols, commas, and spaces
  s = s.replace(/[$€£₹,\s]/g, '');

  // Handle negative sign
  const isNeg = s.startsWith('-');
  if (isNeg) {
    s = s.slice(1);
  }

  const amount = parseFloat(s);
  if (isNaN(amount)) return 0;

  // Return absolute value — we treat all entries as spend
  return Math.abs(amount);
}

/**
 * Parse a date string into YYYY-MM format for monthly grouping.
 * Handles: "2026-01-15", "01/15/2026", "15/01/2026", "Jan 15, 2026", etc.
 */
export function parseDateToMonth(raw: string): string | null {
  if (!raw || raw.trim() === '') return null;

  const s = raw.trim();

  // Try ISO format: YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}`;
  }

  // Try US format: MM/DD/YYYY or MM-DD-YYYY
  const usMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (usMatch) {
    const month = parseInt(usMatch[1]);
    const day = parseInt(usMatch[2]);
    const year = parseInt(usMatch[3]);
    // Heuristic: if first number > 12, it's probably DD/MM/YYYY
    if (month > 12 && day <= 12) {
      return `${year}-${String(day).padStart(2, '0')}`;
    }
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  // Try named month: "Jan 15, 2026" or "15 Jan 2026"
  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const namedMatch = s.match(/(\w{3})\w*\s+\d{1,2},?\s+(\d{4})/i);
  if (namedMatch) {
    const monthNum = monthNames[namedMatch[1].toLowerCase()];
    if (monthNum) {
      return `${namedMatch[2]}-${monthNum}`;
    }
  }

  // Try "15 Jan 2026" format
  const namedMatch2 = s.match(/\d{1,2}\s+(\w{3})\w*\s+(\d{4})/i);
  if (namedMatch2) {
    const monthNum = monthNames[namedMatch2[1].toLowerCase()];
    if (monthNum) {
      return `${namedMatch2[2]}-${monthNum}`;
    }
  }

  // Fallback: try Date constructor
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  return null;
}

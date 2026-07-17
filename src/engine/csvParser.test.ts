// src/engine/csvParser.test.ts
import { describe, it, expect } from 'vitest';
import { detectColumns, parseAmount, parseDateToMonth } from './csvParser';

describe('detectColumns', () => {
  it('detects standard headers', () => {
    const result = detectColumns(['Date', 'Description', 'Amount']);
    expect(result).toEqual({
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
    });
  });

  it('detects common bank-specific headers', () => {
    const result = detectColumns(['Transaction Date', 'Narration', 'Debit', 'Credit', 'Balance']);
    expect(result).toEqual({
      date: 'Transaction Date',
      description: 'Narration',
      amount: 'Debit',
    });
  });

  it('detects case-insensitive headers', () => {
    const result = detectColumns(['DATE', 'DESCRIPTION', 'AMOUNT']);
    expect(result).toEqual({
      date: 'DATE',
      description: 'DESCRIPTION',
      amount: 'AMOUNT',
    });
  });

  it('detects headers with extra whitespace', () => {
    const result = detectColumns(['  Posting Date  ', ' Merchant ', ' Withdrawal ']);
    expect(result).toEqual({
      date: '  Posting Date  ',
      description: ' Merchant ',
      amount: ' Withdrawal ',
    });
  });

  it('returns null when date column missing', () => {
    const result = detectColumns(['Description', 'Amount']);
    expect(result).toBeNull();
  });

  it('returns null when description column missing', () => {
    const result = detectColumns(['Date', 'Amount']);
    expect(result).toBeNull();
  });

  it('returns null when amount column missing', () => {
    const result = detectColumns(['Date', 'Description']);
    expect(result).toBeNull();
  });

  it('returns null for completely unknown headers', () => {
    const result = detectColumns(['Col1', 'Col2', 'Col3']);
    expect(result).toBeNull();
  });

  it('handles empty headers array', () => {
    const result = detectColumns([]);
    expect(result).toBeNull();
  });
});

describe('parseAmount', () => {
  it('parses plain number', () => {
    expect(parseAmount('100.00')).toBe(100);
  });

  it('parses with dollar sign', () => {
    expect(parseAmount('$1,234.56')).toBe(1234.56);
  });

  it('parses negative as absolute value', () => {
    expect(parseAmount('-50.00')).toBe(50);
  });

  it('parses parenthesized negative', () => {
    expect(parseAmount('(100.00)')).toBe(100);
  });

  it('parses with commas', () => {
    expect(parseAmount('10,000.00')).toBe(10000);
  });

  it('returns 0 for empty string', () => {
    expect(parseAmount('')).toBe(0);
  });

  it('returns 0 for non-numeric', () => {
    expect(parseAmount('abc')).toBe(0);
  });

  it('handles euro symbol', () => {
    expect(parseAmount('€99.99')).toBe(99.99);
  });
});

describe('parseDateToMonth', () => {
  it('parses ISO date', () => {
    expect(parseDateToMonth('2026-01-15')).toBe('2026-01');
  });

  it('parses US date MM/DD/YYYY', () => {
    expect(parseDateToMonth('03/15/2026')).toBe('2026-03');
  });

  it('parses US date with dashes', () => {
    expect(parseDateToMonth('03-15-2026')).toBe('2026-03');
  });

  it('parses named month format', () => {
    expect(parseDateToMonth('Jan 15, 2026')).toBe('2026-01');
  });

  it('parses day-first named month', () => {
    expect(parseDateToMonth('15 Jan 2026')).toBe('2026-01');
  });

  it('returns null for empty string', () => {
    expect(parseDateToMonth('')).toBeNull();
  });

  it('returns null for garbage', () => {
    expect(parseDateToMonth('not a date')).toBeNull();
  });

  it('pads single-digit months', () => {
    expect(parseDateToMonth('2026-3-15')).toBe('2026-03');
  });
});

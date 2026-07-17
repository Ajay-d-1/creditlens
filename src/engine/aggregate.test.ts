// src/engine/aggregate.test.ts
import { describe, it, expect } from 'vitest';
import { aggregateTransactions } from './aggregate';
import type { ParsedTransaction, VendorMatch } from './types';

// Simple mock matcher
function mockMatcher(description: string): VendorMatch | null {
  const upper = description.toUpperCase();
  if (upper.includes('OPENAI') || upper.includes('CHATGPT')) {
    return { vendorId: 'openai', displayName: 'OpenAI / ChatGPT', category: 'chat' };
  }
  if (upper.includes('CURSOR')) {
    return { vendorId: 'cursor', displayName: 'Cursor', category: 'coding' };
  }
  if (upper.includes('ANTHROPIC')) {
    return { vendorId: 'anthropic', displayName: 'Anthropic / Claude', category: 'chat' };
  }
  return null;
}

function makeTx(date: string, description: string, amount: number): ParsedTransaction {
  return { date, description, amount, rawRow: { date, description, amount: String(amount) } };
}

describe('aggregateTransactions', () => {
  it('groups transactions by vendor and month', () => {
    const rows: ParsedTransaction[] = [
      makeTx('2026-01-15', 'OPENAI CHATGPT', 20),
      makeTx('2026-01-20', 'CURSOR.COM', 20),
      makeTx('2026-02-15', 'OPENAI CHATGPT', 20),
      makeTx('2026-02-18', 'OPENAI API USAGE', 5),
    ];

    const result = aggregateTransactions(rows, mockMatcher);

    expect(result.totalMatched).toBe(4);
    expect(result.totalRows).toBe(4);
    expect(result.unmatchedRows).toHaveLength(0);
    expect(result.vendors).toHaveLength(2);

    const openai = result.vendors.find((v) => v.vendorId === 'openai');
    expect(openai).toBeDefined();
    expect(openai!.monthlyAmounts['2026-01']).toBe(20);
    expect(openai!.monthlyAmounts['2026-02']).toBe(25); // 20 + 5
  });

  it('separates unmatched rows', () => {
    const rows: ParsedTransaction[] = [
      makeTx('2026-01-15', 'OPENAI CHATGPT', 20),
      makeTx('2026-01-20', 'AMAZON PRIME', 14.99),
      makeTx('2026-01-25', 'SPOTIFY', 9.99),
    ];

    const result = aggregateTransactions(rows, mockMatcher);

    expect(result.totalMatched).toBe(1);
    expect(result.unmatchedRows).toHaveLength(2);
    expect(result.unmatchedRows[0].description).toBe('AMAZON PRIME');
  });

  it('handles empty input', () => {
    const result = aggregateTransactions([], mockMatcher);

    expect(result.vendors).toHaveLength(0);
    expect(result.unmatchedRows).toHaveLength(0);
    expect(result.totalMatched).toBe(0);
    expect(result.totalRows).toBe(0);
  });

  it('sorts vendors by total spend descending', () => {
    const rows: ParsedTransaction[] = [
      makeTx('2026-01-15', 'CURSOR.COM', 20),
      makeTx('2026-01-15', 'OPENAI CHATGPT', 100),
      makeTx('2026-02-15', 'OPENAI CHATGPT', 100),
    ];

    const result = aggregateTransactions(rows, mockMatcher);

    expect(result.vendors[0].vendorId).toBe('openai');
    expect(result.vendors[1].vendorId).toBe('cursor');
  });

  it('handles multiple vendors across multiple months', () => {
    const rows: ParsedTransaction[] = [
      makeTx('2026-01-05', 'OPENAI CHATGPT', 20),
      makeTx('2026-01-10', 'CURSOR.COM', 20),
      makeTx('2026-01-15', 'ANTHROPIC CLAUDE', 20),
      makeTx('2026-02-05', 'OPENAI CHATGPT', 20),
      makeTx('2026-02-10', 'CURSOR.COM', 20),
      makeTx('2026-03-05', 'OPENAI CHATGPT', 25),
    ];

    const result = aggregateTransactions(rows, mockMatcher);

    expect(result.vendors).toHaveLength(3);
    expect(result.totalMatched).toBe(6);

    const openai = result.vendors.find((v) => v.vendorId === 'openai');
    expect(Object.keys(openai!.monthlyAmounts)).toHaveLength(3);
    expect(openai!.monthlyAmounts['2026-03']).toBe(25);
  });

  it('handles all unmatched transactions', () => {
    const rows: ParsedTransaction[] = [
      makeTx('2026-01-15', 'STARBUCKS', 5),
      makeTx('2026-01-20', 'UBER', 12),
    ];

    const result = aggregateTransactions(rows, mockMatcher);

    expect(result.vendors).toHaveLength(0);
    expect(result.unmatchedRows).toHaveLength(2);
    expect(result.totalMatched).toBe(0);
  });
});

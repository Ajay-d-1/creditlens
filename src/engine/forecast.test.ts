// src/engine/forecast.test.ts
import { describe, it, expect } from 'vitest';
import { forecastVendor } from './forecast';

describe('forecastVendor', () => {
  it('predicts stable spend for flat data', () => {
    const result = forecastVendor('openai', {
      '2026-01': 20,
      '2026-02': 20,
      '2026-03': 20,
    });

    expect(result.vendorId).toBe('openai');
    expect(result.trend).toBe('stable');
    expect(result.slope).toBe(0);
    expect(Object.keys(result.predictedAmounts)).toHaveLength(3);
    expect(result.predictedAmounts['2026-04']).toBe(20);
    expect(result.predictedAmounts['2026-05']).toBe(20);
    expect(result.predictedAmounts['2026-06']).toBe(20);
  });

  it('detects increasing trend', () => {
    const result = forecastVendor('cursor', {
      '2026-01': 10,
      '2026-02': 15,
      '2026-03': 20,
      '2026-04': 25,
    });

    expect(result.trend).toBe('increasing');
    expect(result.slope).toBe(5);
    expect(result.predictedAmounts['2026-05']).toBeGreaterThan(25);
  });

  it('detects decreasing trend', () => {
    const result = forecastVendor('stability', {
      '2026-01': 50,
      '2026-02': 40,
      '2026-03': 30,
      '2026-04': 20,
    });

    expect(result.trend).toBe('decreasing');
    expect(result.slope).toBe(-10);
    expect(result.predictedAmounts['2026-05']).toBeLessThan(20);
  });

  it('floors predicted amounts at 0', () => {
    const result = forecastVendor('test', {
      '2026-01': 20,
      '2026-02': 10,
      '2026-03': 5,
      '2026-04': 1,
    }, 5);

    for (const amount of Object.values(result.predictedAmounts)) {
      expect(amount).toBeGreaterThanOrEqual(0);
    }
  });

  it('handles single data point', () => {
    const result = forecastVendor('single', {
      '2026-03': 42,
    });

    expect(result.trend).toBe('stable');
    expect(result.slope).toBe(0);
    expect(result.predictedAmounts['2026-04']).toBe(42);
  });

  it('handles empty data', () => {
    const result = forecastVendor('empty', {});

    expect(result.trend).toBe('stable');
    expect(result.slope).toBe(0);
    expect(Object.keys(result.predictedAmounts)).toHaveLength(3);
  });

  it('generates correct future month keys', () => {
    const result = forecastVendor('test', {
      '2026-10': 20,
      '2026-11': 20,
      '2026-12': 20,
    });

    expect(result.predictedAmounts).toHaveProperty('2027-01');
    expect(result.predictedAmounts).toHaveProperty('2027-02');
    expect(result.predictedAmounts).toHaveProperty('2027-03');
  });

  it('respects custom forecast months parameter', () => {
    const result = forecastVendor('test', {
      '2026-01': 20,
      '2026-02': 25,
    }, 6);

    expect(Object.keys(result.predictedAmounts)).toHaveLength(6);
  });
});

import { runAudit } from './audit-engine';

describe('Audit Engine', () => {
  test('Cursor Business with 2 seats should recommend Pro (minimum seat waste)', () => {
    const result = runAudit([
      { id: '1', tool: 'cursor', plan: 'Business', monthlySpend: 200, seats: 2 }
    ], 2, 'coding');
    
    expect(result.findings.length).toBe(1);
    expect(result.findings[0].tool).toBe('Cursor');
    expect(result.findings[0].recommendedPlan).toBe('Pro');
    expect(result.findings[0].savings).toBe(160);
  });

  test('Cursor Pro with 1 seat should be optimal (no findings)', () => {
    const result = runAudit([
      { id: '1', tool: 'cursor', plan: 'Pro', monthlySpend: 20, seats: 1 }
    ], 1, 'coding');
    
    expect(result.findings.length).toBe(0);
    expect(result.totalMonthlySavings).toBe(0);
  });

  test('Multiple coding assistants should flag duplication', () => {
    const result = runAudit([
      { id: '1', tool: 'cursor', plan: 'Pro', monthlySpend: 20, seats: 1 },
      { id: '2', tool: 'copilot', plan: 'Individual', monthlySpend: 10, seats: 1 },
      { id: '3', tool: 'windsurf', plan: 'Pro', monthlySpend: 10, seats: 1 }
    ], 1, 'coding');
    
    const dupFinding = result.findings.find(f => f.tool === 'Multiple Coding Assistants');
    expect(dupFinding).toBeDefined();
    expect(dupFinding?.savings).toBeGreaterThan(0);
  });

  test('Total savings should never exceed total spend', () => {
    const result = runAudit([
      { id: '1', tool: 'cursor', plan: 'Business', monthlySpend: 200, seats: 2 },
      { id: '2', tool: 'claude', plan: 'Team', monthlySpend: 125, seats: 3 }
    ], 5, 'coding');
    
    expect(result.totalMonthlySavings).toBeLessThanOrEqual(result.totalMonthlySpend);
  });

  test('GitHub Copilot Business with 1 seat should recommend Individual', () => {
    const result = runAudit([
      { id: '1', tool: 'copilot', plan: 'Business', monthlySpend: 19, seats: 1 }
    ], 1, 'coding');
    
    const finding = result.findings.find(f => f.tool === 'GitHub Copilot');
    expect(finding).toBeDefined();
    expect(finding?.recommendedPlan).toBe('Individual');
    expect(finding?.savings).toBe(9);
  });

  test('Claude Team with 3 seats should recommend Pro (minimum seat waste)', () => {
    const result = runAudit([
      { id: '1', tool: 'claude', plan: 'Team', monthlySpend: 125, seats: 3 }
    ], 3, 'coding');
    
    expect(result.findings.length).toBe(1);
    expect(result.findings[0].recommendedPlan).toBe('Pro');
    expect(result.findings[0].savings).toBe(65);
  });
});

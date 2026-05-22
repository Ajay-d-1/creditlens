// src/lib/audit-engine.ts
// WHAT: Hardcoded audit rules for AI tool spend optimization
// WHY: The brief explicitly requires hardcoded rules, not AI, for the audit math
// HOW: Each function takes tool data and returns a recommendation with reasoning

// ============================================
// PRICING DATA (from PRICING_DATA.md)
// ============================================

export interface PlanInfo {
    name: string;
    pricePerSeat: number;
    minSeats: number;
    maxSeats: number | null;
    features: string[];
}

export interface ToolPricing {
    name: string;
    plans: Record<string, PlanInfo>;
    apiPricing?: boolean; // true for API-direct tools (no seats)
}

export const PRICING_DATA: Record<string, ToolPricing> = {
    cursor: {
        name: 'Cursor',
        plans: {
            Hobby: { name: 'Hobby', pricePerSeat: 0, minSeats: 1, maxSeats: 1, features: ['basic'] },
            Pro: { name: 'Pro', pricePerSeat: 20, minSeats: 1, maxSeats: null, features: ['unlimited', 'premium-models'] },
            Business: { name: 'Business', pricePerSeat: 40, minSeats: 5, maxSeats: null, features: ['team-admin', 'usage-analytics'] },
            Enterprise: { name: 'Enterprise', pricePerSeat: 0, minSeats: 1, maxSeats: null, features: ['custom'] },
        },
    },
    copilot: {
        name: 'GitHub Copilot',
        plans: {
            Individual: { name: 'Individual', pricePerSeat: 10, minSeats: 1, maxSeats: 1, features: ['basic'] },
            Business: { name: 'Business', pricePerSeat: 19, minSeats: 1, maxSeats: null, features: ['team-management', 'privacy'] },
            Enterprise: { name: 'Enterprise', pricePerSeat: 39, minSeats: 1, maxSeats: null, features: ['sso', 'audit-logs'] },
        },
    },
    claude: {
        name: 'Claude',
        plans: {
            Free: { name: 'Free', pricePerSeat: 0, minSeats: 1, maxSeats: 1, features: ['basic'] },
            Pro: { name: 'Pro', pricePerSeat: 20, minSeats: 1, maxSeats: null, features: ['higher-limits', 'priority'] },
            Max: { name: 'Max', pricePerSeat: 100, minSeats: 1, maxSeats: null, features: ['maximum-limits'] },
            Team: { name: 'Team', pricePerSeat: 25, minSeats: 5, maxSeats: null, features: ['team-admin', 'central-billing'] },
            Enterprise: { name: 'Enterprise', pricePerSeat: 0, minSeats: 1, maxSeats: null, features: ['custom'] },
            'API direct': { name: 'API direct', pricePerSeat: 0, minSeats: 1, maxSeats: null, features: ['pay-as-you-go'] },
        },
    },
    chatgpt: {
        name: 'ChatGPT',
        plans: {
            Plus: { name: 'Plus', pricePerSeat: 20, minSeats: 1, maxSeats: 1, features: ['basic'] },
            Team: { name: 'Team', pricePerSeat: 25, minSeats: 2, maxSeats: null, features: ['team-admin', 'shared-workspace'] },
            Enterprise: { name: 'Enterprise', pricePerSeat: 0, minSeats: 1, maxSeats: null, features: ['custom'] },
            'API direct': { name: 'API direct', pricePerSeat: 0, minSeats: 1, maxSeats: null, features: ['pay-as-you-go'] },
        },
    },
    anthropic_api: {
        name: 'Anthropic API',
        plans: {
            'Pay-as-you-go': { name: 'Pay-as-you-go', pricePerSeat: 0, minSeats: 1, maxSeats: null, features: ['usage-based'] },
        },
        apiPricing: true,
    },
    openai_api: {
        name: 'OpenAI API',
        plans: {
            'Pay-as-you-go': { name: 'Pay-as-you-go', pricePerSeat: 0, minSeats: 1, maxSeats: null, features: ['usage-based'] },
        },
        apiPricing: true,
    },
    gemini: {
        name: 'Gemini',
        plans: {
            Pro: { name: 'Pro', pricePerSeat: 19.99, minSeats: 1, maxSeats: null, features: ['advanced'] },
            Ultra: { name: 'Ultra', pricePerSeat: 0, minSeats: 1, maxSeats: null, features: ['enterprise'] },
            API: { name: 'API', pricePerSeat: 0, minSeats: 1, maxSeats: null, features: ['pay-as-you-go'] },
        },
    },
    windsurf: {
        name: 'Windsurf',
        plans: {
            Free: { name: 'Free', pricePerSeat: 0, minSeats: 1, maxSeats: 1, features: ['basic'] },
            Pro: { name: 'Pro', pricePerSeat: 10, minSeats: 1, maxSeats: null, features: ['unlimited', 'premium'] },
            Teams: { name: 'Teams', pricePerSeat: 20, minSeats: 1, maxSeats: null, features: ['team-admin'] },
            Enterprise: { name: 'Enterprise', pricePerSeat: 0, minSeats: 1, maxSeats: null, features: ['custom'] },
        },
    },
};

// ============================================
// AUDIT INTERFACES
// ============================================

export interface ToolEntry {
    id: string;
    tool: string;
    plan: string;
    monthlySpend: number;
    seats: number;
}

export interface AuditFinding {
    tool: string;
    currentPlan: string;
    currentSpend: number;
    recommendedPlan: string;
    recommendedSpend: number;
    savings: number;
    savingsPercent: number;
    reason: string;
    severity: 'high' | 'medium' | 'low' | 'optimal';
}

export interface AuditResult {
    findings: AuditFinding[];
    totalMonthlySpend: number;
    totalMonthlySavings: number;
    totalAnnualSavings: number;
    summary: string;
}

// ============================================
// AUDIT RULES
// ============================================

/**
 * RULE 1: Minimum seat check
 * If user is on a plan with minimum seats but has fewer, they're overpaying
 */
function checkMinimumSeats(entry: ToolEntry, toolData: ToolPricing): AuditFinding | null {
    const planData = toolData.plans[entry.plan];
    if (!planData) return null;

    // If plan has minimum seats and user has fewer, recommend downgrade
    if (planData.minSeats > 1 && entry.seats < planData.minSeats) {
        const recommendedPlan = findDowngradePlan(entry.tool, entry.plan, entry.seats);

        if (recommendedPlan) {
            const recommendedPlanData = toolData.plans[recommendedPlan];
            const recommendedSpend = recommendedPlanData.pricePerSeat * entry.seats;
            const savings = entry.monthlySpend - recommendedSpend;

            return {
                tool: toolData.name,
                currentPlan: entry.plan,
                currentSpend: entry.monthlySpend,
                recommendedPlan,
                recommendedSpend,
                savings,
                savingsPercent: Math.round((savings / entry.monthlySpend) * 100),
                reason: `You're paying for ${planData.minSeats} minimum seats on ${entry.plan} but only have ${entry.seats} user(s). Switch to ${recommendedPlan} for per-seat pricing.`,
                severity: savings > 100 ? 'high' : 'medium',
            };
        }
    }

    return null;
}

/**
 * RULE 2: Plan overkill check
 * If user has few seats on a high-tier plan, recommend lower tier
 */
function checkPlanOverkill(entry: ToolEntry, toolData: ToolPricing): AuditFinding | null {
    // Skip API pricing tools and Enterprise/Custom plans
    if (toolData.apiPricing || entry.plan === 'Enterprise' || entry.plan === 'API direct') {
        return null;
    }

    const planData = toolData.plans[entry.plan];
    if (!planData) return null;

    // For small teams, check if a lower plan would suffice
    if (entry.seats <= 2 && (entry.plan === 'Business' || entry.plan === 'Team' || entry.plan === 'Teams')) {
        const recommendedPlan = findDowngradePlan(entry.tool, entry.plan, entry.seats);
        if (recommendedPlan && recommendedPlan !== entry.plan) {
            const recommendedPlanData = toolData.plans[recommendedPlan];
            const recommendedSpend = recommendedPlanData.pricePerSeat * entry.seats;
            const savings = entry.monthlySpend - recommendedSpend;

            if (savings > 0) {
                return {
                    tool: toolData.name,
                    currentPlan: entry.plan,
                    currentSpend: entry.monthlySpend,
                    recommendedPlan,
                    recommendedSpend,
                    savings,
                    savingsPercent: Math.round((savings / entry.monthlySpend) * 100),
                    reason: `With only ${entry.seats} user(s), ${entry.plan} is overkill. ${recommendedPlan} covers your needs at ${recommendedPlanData.pricePerSeat}/seat.`,
                    severity: savings > 50 ? 'high' : 'medium',
                };
            }
        }
    }

    return null;
}

/**
 * Helper: Find the best downgrade plan
 */
function findDowngradePlan(tool: string, currentPlan: string, seats: number): string | null {
    const toolData = PRICING_DATA[tool];
    if (!toolData) return null;

    const plans = Object.keys(toolData.plans);
    const currentIndex = plans.indexOf(currentPlan);

    // Look for a lower-tier plan that supports the user's seat count
    for (let i = currentIndex - 1; i >= 0; i--) {
        const planName = plans[i];
        const planData = toolData.plans[planName];

        // Skip plans that don't support the seat count
        if (planData.maxSeats && seats > planData.maxSeats) continue;

        // Skip Enterprise/Custom (price = 0 means custom)
        if (planData.pricePerSeat === 0 && planName !== 'Free') continue;

        return planName;
    }

    return null;
}

/**
 * Helper: Check for duplicate tools (e.g., Cursor + Copilot + Windsurf)
 */
function checkDuplicateTools(entries: ToolEntry[]): AuditFinding[] {
    const codingTools = ['cursor', 'copilot', 'windsurf'];
    const userCodingTools = entries.filter(e => codingTools.includes(e.tool));

    const findings: AuditFinding[] = [];

    if (userCodingTools.length >= 2) {
        const totalSpend = userCodingTools.reduce((sum, e) => sum + e.monthlySpend, 0);
        const cheapest = userCodingTools.reduce((min, e) =>
            e.monthlySpend < min.monthlySpend ? e : min
        );

        findings.push({
            tool: 'Multiple Coding Assistants',
            currentPlan: `${userCodingTools.length} tools`,
            currentSpend: totalSpend,
            recommendedPlan: 'Consolidate to 1-2',
            recommendedSpend: totalSpend * 0.6,
            savings: totalSpend * 0.4,
            savingsPercent: 40,
            reason: `You're paying for ${userCodingTools.length} coding assistants (${userCodingTools.map(e => PRICING_DATA[e.tool]?.name).join(', ')}). Most teams only need 1-2. Consider keeping ${PRICING_DATA[cheapest.tool]?.name} at $${cheapest.monthlySpend}/mo and dropping the rest.`,
            severity: 'medium',
        });
    }

    return findings;
}

// ============================================
// MAIN AUDIT FUNCTION
// ============================================

export function runAudit(entries: ToolEntry[], teamSize: number, useCase: string): AuditResult {
    const findings: AuditFinding[] = [];

    // Per-tool audits
    for (const entry of entries) {
        const toolData = PRICING_DATA[entry.tool];
        if (!toolData) continue;

        // Skip if monthly spend is 0 (free plan or not entered)
        if (entry.monthlySpend === 0) continue;

        // Rule 1: Minimum seat check
        const minSeatFinding = checkMinimumSeats(entry, toolData);
        if (minSeatFinding) findings.push(minSeatFinding);

        // Rule 2: Plan overkill check
        const overkillFinding = checkPlanOverkill(entry, toolData);
        if (overkillFinding) findings.push(overkillFinding);
    }

    // Cross-tool audits
    const duplicateFindings = checkDuplicateTools(entries);
    findings.push(...duplicateFindings);

    // DEDUPLICATE: Keep only highest savings finding per tool
    const uniqueFindings: AuditFinding[] = [];
    const bestFindingForTool = new Map<string, AuditFinding>();

    for (const finding of findings) {
        const existing = bestFindingForTool.get(finding.tool);
        if (!existing || finding.savings > existing.savings) {
            bestFindingForTool.set(finding.tool, finding);
        }
    }

    uniqueFindings.push(...bestFindingForTool.values());
    uniqueFindings.sort((a, b) => b.savings - a.savings);

    // Calculate totals
    const totalMonthlySpend = entries.reduce((sum, e) => sum + e.monthlySpend, 0);
    const totalMonthlySavings = uniqueFindings.reduce((sum, f) => sum + f.savings, 0);
    const totalAnnualSavings = totalMonthlySavings * 12;

    // Generate summary
    let summary: string;
    if (uniqueFindings.length === 0) {
        summary = `Your AI tool spend looks well-optimized at $${totalMonthlySpend}/month. We didn't find significant savings opportunities.`;
    } else {
        const topFinding = uniqueFindings[0];
        summary = `We found ${uniqueFindings.length} optimization${uniqueFindings.length > 1 ? 's' : ''} that could save you $${Math.round(totalMonthlySavings)}/month ($${Math.round(totalAnnualSavings)}/year). The biggest opportunity: ${topFinding.reason}`;
    }

    return {
        findings: uniqueFindings,
        totalMonthlySpend,
        totalMonthlySavings,
        totalAnnualSavings,
        summary,
    };
}
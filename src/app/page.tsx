'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, Calculator } from 'lucide-react';
import { runAudit, AuditResult } from '@/lib/audit-engine';

interface ToolEntry {
  id: string;
  tool: string;
  plan: string;
  monthlySpend: number;
  seats: number;
}

const TOOLS = {
  cursor: {
    name: 'Cursor',
    plans: ['Hobby', 'Pro', 'Business', 'Enterprise'],
    hasSeats: true,
  },
  copilot: {
    name: 'GitHub Copilot',
    plans: ['Individual', 'Business', 'Enterprise'],
    hasSeats: true,
  },
  claude: {
    name: 'Claude',
    plans: ['Free', 'Pro', 'Max', 'Team', 'Enterprise', 'API direct'],
    hasSeats: true,
  },
  chatgpt: {
    name: 'ChatGPT',
    plans: ['Plus', 'Team', 'Enterprise', 'API direct'],
    hasSeats: true,
  },
  anthropic_api: {
    name: 'Anthropic API',
    plans: ['Pay-as-you-go'],
    hasSeats: false,
  },
  openai_api: {
    name: 'OpenAI API',
    plans: ['Pay-as-you-go'],
    hasSeats: false,
  },
  gemini: {
    name: 'Gemini',
    plans: ['Pro', 'Ultra', 'API'],
    hasSeats: true,
  },
  windsurf: {
    name: 'Windsurf',
    plans: ['Free', 'Pro', 'Teams', 'Enterprise'],
    hasSeats: true,
  },
};

const USE_CASES = ['coding', 'writing', 'data', 'research', 'mixed'];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export default function Home() {
  const [entries, setEntries] = useState<ToolEntry[]>([]);
  const [teamSize, setTeamSize] = useState<number>(1);
  const [useCase, setUseCase] = useState<string>('coding');
  
  // NEW: State for audit results
  const [auditResult, setAuditResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('creditlens_form');
    if (saved) {
      const parsed = JSON.parse(saved);
      setEntries(parsed.entries || []);
      setTeamSize(parsed.teamSize || 1);
      setUseCase(parsed.useCase || 'coding');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('creditlens_form', JSON.stringify({ entries, teamSize, useCase }));
  }, [entries, teamSize, useCase]);

  function addEntry() {
    const newEntry: ToolEntry = {
      id: generateId(),
      tool: 'cursor',
      plan: 'Hobby',
      monthlySpend: 0,
      seats: 1,
    };
    setEntries([...entries, newEntry]);
  }

  function updateEntry(id: string, field: keyof ToolEntry, value: string | number) {
    setEntries(entries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  }

  function removeEntry(id: string) {
    setEntries(entries.filter(entry => entry.id !== id));
  }

  const totalSpend = entries.reduce((sum, entry) => sum + (entry.monthlySpend || 0), 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            CreditLens
          </h1>
          <p className="text-slate-400 text-lg">
            Audit your AI tool spend. Find savings instantly.
          </p>
        </div>

        {!showResults ? (
          // FORM VIEW
          <>
            {/* Team Info */}
            <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-cyan-400" />
                Team Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Team Size</label>
                  <input
                    type="number"
                    min={1}
                    value={teamSize}
                    onChange={(e) => setTeamSize(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 text-white border border-slate-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Primary Use Case</label>
                  <div className="relative">
                    <select
                      value={useCase}
                      onChange={(e) => setUseCase(e.target.value)}
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 text-white border border-slate-600 focus:border-cyan-400 focus:outline-none appearance-none"
                    >
                      {USE_CASES.map(uc => (
                        <option key={uc} value={uc}>{uc.charAt(0).toUpperCase() + uc.slice(1)}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tool Entries */}
            <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">AI Tools</h2>
                <button
                  onClick={addEntry}
                  className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Tool
                </button>
              </div>

              {entries.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  No tools added yet. Click "Add Tool" to start your audit.
                </p>
              ) : (
                <div className="space-y-4">
                  {entries.map((entry) => (
                    <div key={entry.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-slate-700/50 rounded-lg p-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Tool</label>
                        <select
                          value={entry.tool}
                          onChange={(e) => updateEntry(entry.id, 'tool', e.target.value)}
                          className="w-full bg-slate-600 rounded-lg px-3 py-2 text-white border border-slate-500 focus:border-cyan-400 focus:outline-none"
                        >
                          {Object.entries(TOOLS).map(([key, tool]) => (
                            <option key={key} value={key}>{tool.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Plan</label>
                        <select
                          value={entry.plan}
                          onChange={(e) => updateEntry(entry.id, 'plan', e.target.value)}
                          className="w-full bg-slate-600 rounded-lg px-3 py-2 text-white border border-slate-500 focus:border-cyan-400 focus:outline-none"
                        >
                          {TOOLS[entry.tool as keyof typeof TOOLS].plans.map(plan => (
                            <option key={plan} value={plan}>{plan}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Monthly Spend ($)</label>
                        <input
                          type="number"
                          min={0}
                          value={entry.monthlySpend}
                          onChange={(e) => updateEntry(entry.id, 'monthlySpend', Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-slate-600 rounded-lg px-3 py-2 text-white border border-slate-500 focus:border-cyan-400 focus:outline-none"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Seats</label>
                        <input
                          type="number"
                          min={1}
                          value={entry.seats}
                          onChange={(e) => updateEntry(entry.id, 'seats', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-slate-600 rounded-lg px-3 py-2 text-white border border-slate-500 focus:border-cyan-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {entries.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-600 flex justify-between items-center">
                  <span className="text-slate-400">Total Monthly Spend</span>
                  <span className="text-2xl font-bold text-cyan-400">${totalSpend.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Run Audit Button */}
            {entries.length > 0 && (
              <button 
                onClick={() => {
                  const result = runAudit(entries, teamSize, useCase);
                  setAuditResult(result);
                  setShowResults(true);
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-4 rounded-xl text-lg transition-all transform hover:scale-[1.02]"
              >
                Run Audit →
              </button>
            )}
          </>
        ) : (
          // RESULTS VIEW
          <div className="space-y-6">
            {/* Hero Savings */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-8 text-center border border-green-500/30">
              <p className="text-green-400 text-sm uppercase tracking-wide mb-2">Potential Monthly Savings</p>
              <p className="text-5xl font-bold text-white mb-2">
                ${Math.round(auditResult?.totalMonthlySavings || 0).toLocaleString()}
              </p>
              <p className="text-slate-400">
                ${Math.round((auditResult?.totalAnnualSavings || 0)).toLocaleString()} / year
              </p>
            </div>

            {/* Findings */}
            {auditResult && auditResult.findings.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">Recommendations</h3>
                {auditResult.findings.map((finding: any, index: number) => (
                  <div 
                    key={index} 
                    className={`rounded-lg p-4 border ${
                      finding.severity === 'high' 
                        ? 'bg-red-500/10 border-red-500/30' 
                        : finding.severity === 'medium'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-blue-500/10 border-blue-500/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-white">{finding.tool}</h4>
                      <span className={`text-xs px-2 py-1 rounded ${
                        finding.severity === 'high' 
                          ? 'bg-red-500/20 text-red-400' 
                          : finding.severity === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {finding.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm mb-2">{finding.reason}</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">
                        {finding.currentPlan} → {finding.recommendedPlan}
                      </span>
                      <span className="text-green-400 font-semibold">
                        Save ${Math.round(finding.savings)}/mo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-green-500/10 rounded-xl p-6 text-center border border-green-500/30">
                <p className="text-green-400 text-lg font-semibold mb-2">You're all set!</p>
                <p className="text-slate-400">{auditResult?.summary}</p>
              </div>
            )}

            {/* Back Button */}
            <button
              onClick={() => setShowResults(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors"
            >
              ← Back to Form
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
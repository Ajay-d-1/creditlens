'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, Calculator } from 'lucide-react';

// WHAT: TypeScript interface defining the shape of our data
// WHY: Catches errors at compile time. If you try to assign a string to 'monthlySpend', TypeScript yells.
// HOW: Every tool entry must match this exact structure
interface ToolEntry {
  id: string;
  tool: string;
  plan: string;
  monthlySpend: number;
  seats: number;
}

// WHAT: All supported tools and their plans
// WHY: Hardcoded list prevents garbage input. Users pick from dropdowns, not free text.
// HOW: This data drives the form dropdowns and the audit engine
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

// WHAT: Generates a random ID for each tool entry
// WHY: React needs unique keys when rendering lists. Without them, re-rendering breaks.
// HOW: Math.random() + toString(36) creates a short unique string
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export default function Home() {
  // WHAT: React state — the "memory" of your component
  // WHY: When state changes, React automatically re-renders the UI. No manual DOM manipulation.
  // HOW: useState returns [currentValue, setterFunction]. You call the setter to update.
  const [entries, setEntries] = useState<ToolEntry[]>([]);
  const [teamSize, setTeamSize] = useState<number>(1);
  const [useCase, setUseCase] = useState<string>('coding');

  // WHAT: useEffect — runs side effects (things outside React's control)
  // WHY: localStorage is a browser API, not React state. useEffect bridges React and the browser.
  // HOW: Runs once on mount (empty dependency array []), loads saved data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('creditlens_form');
    if (saved) {
      const parsed = JSON.parse(saved);
      setEntries(parsed.entries || []);
      setTeamSize(parsed.teamSize || 1);
      setUseCase(parsed.useCase || 'coding');
    }
  }, []); // Empty array = run only once when component mounts

  // WHAT: Another useEffect — saves to localStorage whenever state changes
  // WHY: If user accidentally refreshes, they don't lose 5 minutes of data entry
  // HOW: Runs every time entries, teamSize, or useCase changes
  useEffect(() => {
    localStorage.setItem('creditlens_form', JSON.stringify({ entries, teamSize, useCase }));
  }, [entries, teamSize, useCase]); // These are the "dependencies" — effect runs when any change

  // WHAT: Function to add a new empty tool entry
  // WHY: Users need to add multiple tools. Each gets its own row.
  // HOW: Creates new entry, spreads existing entries, updates state
  function addEntry() {
    const newEntry: ToolEntry = {
      id: generateId(),
      tool: 'cursor',
      plan: 'Hobby',
      monthlySpend: 0,
      seats: 1,
    };
    setEntries([...entries, newEntry]); // ... = spread operator, copies existing array
  }

  // WHAT: Updates a specific field of a specific entry
  // WHY: Each row has 4 fields (tool, plan, spend, seats). We need to update just one.
  // HOW: Maps over entries, finds the one with matching id, updates that field, keeps others same
  function updateEntry(id: string, field: keyof ToolEntry, value: string | number) {
    setEntries(entries.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  }

  // WHAT: Removes an entry
  // WHY: Users make mistakes or change their mind
  // HOW: Filters out the entry with matching id
  function removeEntry(id: string) {
    setEntries(entries.filter(entry => entry.id !== id));
  }

  // WHAT: Calculates total monthly spend across all tools
  // WHY: Shows a running total as user adds tools
  // HOW: reduce() accumulates a sum. Starts at 0, adds each entry's monthlySpend.
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
                  {/* Tool Selector */}
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

                  {/* Plan Selector */}
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

                  {/* Monthly Spend */}
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

                  {/* Seats */}
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

                  {/* Remove Button */}
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

          {/* Total */}
          {entries.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-600 flex justify-between items-center">
              <span className="text-slate-400">Total Monthly Spend</span>
              <span className="text-2xl font-bold text-cyan-400">${totalSpend.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Audit Button */}
        {entries.length > 0 && (
          <button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-4 rounded-xl text-lg transition-all transform hover:scale-[1.02]">
            Run Audit →
          </button>
        )}
      </div>
    </main>
  );
}
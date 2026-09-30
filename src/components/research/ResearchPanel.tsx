import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { ResearchResult } from '../../../shared/types/index.ts';
import { DataSourceBadge } from '../common/Badges.tsx';
import { calculateExpectedValue, calculateImpliedProbability } from '../../../shared/utils/calculations.ts';
import {
  Search,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Calculator,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

export const ResearchPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [fixtures, setFixtures] = useState<ResearchResult[]>([]);
  const [selectedFixture, setSelectedFixture] = useState<ResearchResult | null>(null);
  const [providerStatus, setProviderStatus] = useState<any>(null);

  // EV Calculator state
  const [testOdds, setTestOdds] = useState('1.85');
  const [testEstimatedProb, setTestEstimatedProb] = useState('60');

  useEffect(() => {
    loadFixtures();
  }, []);

  const loadFixtures = async (q?: string) => {
    try {
      const data = await api.getFixtures(q);
      if (data.success) {
        setFixtures(data.fixtures);
        setProviderStatus(data.status);
        if (!selectedFixture && data.fixtures.length > 0) {
          setSelectedFixture(data.fixtures[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load fixtures', e);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFixtures(searchQuery);
  };

  // EV math calculations
  const oddsVal = parseFloat(testOdds) || 1.85;
  const probVal = (parseFloat(testEstimatedProb) || 60) / 100;
  const evResult = calculateExpectedValue(oddsVal, probVal, 1000);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#0B1020]">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-400" />
          Sports Fixture Research
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Inspect verified Head-to-Head records, recent league form, standings, and calculate mathematical EV.
        </p>
      </div>

      {/* Provider Status / Attribution Notice */}
      {providerStatus && (
        <div className="p-3 rounded-xl bg-[#121A2B] border border-[#1E2D4A] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">
              Provider: <strong className="text-white">{providerStatus.providerName}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">{providerStatus.freshness}</span>
          </div>

          <div className="text-[11px] text-slate-500">
            Never fabricates unverified injuries or live line changes
          </div>
        </div>
      )}

      {/* Fixture Selector & Search */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search match or team (e.g. Arsenal, Chelsea, Real Madrid)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121A2B] border border-[#1E2D4A] text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#18233A] hover:bg-[#1E2D4A] text-white text-xs font-semibold rounded-xl border border-[#1E2D4A] transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {fixtures.map((f) => (
            <button
              key={f.fixtureId}
              onClick={() => setSelectedFixture(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                selectedFixture?.fixtureId === f.fixtureId
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : 'bg-[#121A2B] text-slate-300 border-[#1E2D4A] hover:bg-[#18233A]'
              }`}
            >
              {f.homeTeam} vs {f.awayTeam}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Match Card */}
      {selectedFixture ? (
        <div className="space-y-6">
          {/* Match Banner */}
          <div className="p-6 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E2D4A] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded border border-blue-800/60">
                  {selectedFixture.competition}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(selectedFixture.kickoffTime || '').toLocaleString()}
                </span>
              </div>
              <DataSourceBadge status={selectedFixture.sourceStatus} />
            </div>

            <div className="grid grid-cols-3 items-center text-center py-2">
              <div className="space-y-1">
                <h2 className="text-lg sm:text-2xl font-black text-white">{selectedFixture.homeTeam}</h2>
                <div className="flex items-center justify-center gap-1">
                  {selectedFixture.homeForm.map((res, i) => (
                    <span
                      key={i}
                      className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                        res === 'W'
                          ? 'bg-emerald-600 text-white'
                          : res === 'D'
                          ? 'bg-slate-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {res}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">VS</span>
                <div className="text-[11px] text-slate-400 font-mono">
                  H2H: {selectedFixture.headToHead.homeWins}W - {selectedFixture.headToHead.draws}D -{' '}
                  {selectedFixture.headToHead.awayWins}W
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="text-lg sm:text-2xl font-black text-white">{selectedFixture.awayTeam}</h2>
                <div className="flex items-center justify-center gap-1">
                  {selectedFixture.awayForm.map((res, i) => (
                    <span
                      key={i}
                      className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                        res === 'W'
                          ? 'bg-emerald-600 text-white'
                          : res === 'D'
                          ? 'bg-slate-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {res}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Separation of FACTS vs MODEL ESTIMATES vs LIMITATIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. FACTS: Verified Statistics */}
            <div className="p-5 rounded-xl bg-[#121A2B] border border-[#1E2D4A] space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Verified Match Statistics (FACTS)
                </h3>
              </div>

              <div className="space-y-2 pt-1">
                {selectedFixture.statistics.map((stat, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#0B1020] border border-[#1E2D4A] flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-emerald-400 font-mono">{stat.homeValue}</span>
                    <span className="text-slate-400 text-center px-2">{stat.label}</span>
                    <span className="font-bold text-blue-400 font-mono">{stat.awayValue}</span>
                  </div>
                ))}
              </div>

              {/* Head-to-Head Past Matches */}
              <div className="pt-2 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Recent Meetings
                </span>
                {selectedFixture.headToHead.lastMatches.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-xs p-2 rounded bg-[#0B1020] text-slate-300 font-mono"
                  >
                    <span>{m.date}</span>
                    <span>
                      {m.homeTeam} {m.homeScore} - {m.awayScore} {m.awayTeam}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. MODEL OBSERVATIONS & LIMITATIONS */}
            <div className="p-5 rounded-xl bg-[#121A2B] border border-[#1E2D4A] space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Model Observations & Trends
                  </h3>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-300">
                  {selectedFixture.observations.map((obs, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-[#0B1020] p-2.5 rounded-lg border border-[#1E2D4A]">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Limitations Notice */}
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Data Limitations & Unknowns:</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-500">
                  {selectedFixture.limitations.map((lim, idx) => (
                    <li key={idx}>- {lim}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Interactive EV & Implied Probability Calculator Card */}
          <div className="p-5 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-4 shadow-lg">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Expected Value (EV) & Edge Calculator
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Formula: <code className="text-purple-300 font-mono">EV per unit = (Estimated Probability × Decimal Odds) - 1</code>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Decimal Odds (Bookmaker)</label>
                <input
                  type="number"
                  step="0.05"
                  min="1.05"
                  value={testOdds}
                  onChange={(e) => setTestOdds(e.target.value)}
                  className="w-full bg-[#0B1020] border border-[#1E2D4A] text-emerald-400 font-mono font-bold text-sm rounded-lg p-2 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Estimated Prob (%)</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={testEstimatedProb}
                  onChange={(e) => setTestEstimatedProb(e.target.value)}
                  className="w-full bg-[#0B1020] border border-[#1E2D4A] text-blue-400 font-mono font-bold text-sm rounded-lg p-2 outline-none"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-[#0B1020] border border-[#1E2D4A]">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Implied Probability</span>
                <span className="text-lg font-bold text-slate-300 font-mono">
                  {(evResult.impliedProbability * 100).toFixed(1)}%
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0B1020] border border-[#1E2D4A]">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Expected Value (EV)</span>
                <span
                  className={`text-lg font-black font-mono ${
                    evResult.expectedValuePerUnit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {evResult.expectedValuePerUnit >= 0 ? '+' : ''}
                  {(evResult.expectedValuePerUnit * 100).toFixed(1)}% ({evResult.edgePercentage > 0 ? `+${evResult.edgePercentage}% edge` : `${evResult.edgePercentage}%`})
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500 rounded-xl bg-[#121A2B] border border-[#1E2D4A]">
          No fixture research found. Try searching above.
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { calibrationService } from '../../services/calibrationService.ts';
import {
  CalibrationDashboardData,
  CalibrationDashboardFilter,
} from '../../../shared/types/index.ts';
import {
  BarChart3,
  TrendingUp,
  Target,
  ShieldCheck,
  Percent,
  Calendar,
  Filter,
  RefreshCw,
  Award,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export const CalibrationDashboard: React.FC = () => {
  const { formatMoney } = useAuth();
  const [data, setData] = useState<CalibrationDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<CalibrationDashboardFilter>({
    dateRange: 'all',
    sport: 'all',
    market: 'all',
  });

  const loadData = async (activeFilter = filter) => {
    setLoading(true);
    try {
      const res = await calibrationService.getDashboardData(activeFilter);
      setData(res);
    } catch (e) {
      console.error('Failed to load calibration dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filter);
  }, [filter]);

  const handleDateFilterChange = (range: 'all' | '7d' | '30d' | '90d') => {
    setFilter((prev) => ({ ...prev, dateRange: range }));
  };

  const handleSportFilterChange = (sport: 'all' | 'football' | 'basketball' | 'tennis') => {
    setFilter((prev) => ({ ...prev, sport }));
  };

  const handleMarketFilterChange = (
    market: 'all' | '1x2' | 'over_under' | 'btts' | 'double_chance' | 'dnb'
  ) => {
    setFilter((prev) => ({ ...prev, market }));
  };

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const { accuracy, financial, bettingFormats, calibrationBuckets, marketsPerformance, confidenceBands, timeSeries, recentSettledPredictions } = data;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#0B1020] text-slate-200">
      {/* Top Banner & Header */}
      <div className="p-6 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1E2D4A] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-lg md:text-xl font-black text-white tracking-tight">
                  Model Accuracy & ROI Calibration
                </h1>
                <p className="text-xs text-slate-400">
                  Empirical backtesting, probability calibration curve, and realized returns
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => loadData(filter)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18233A] hover:bg-[#1E2D4A] text-slate-200 text-xs font-semibold border border-[#1E2D4A] cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Date Range Tabs */}
          <div className="flex items-center gap-1 bg-[#0B1020] p-1 rounded-xl border border-[#1E2D4A]">
            <span className="text-[11px] font-bold text-slate-500 uppercase px-2">Period:</span>
            {[
              { id: 'all', label: 'All Time' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '90d', label: 'Last 90 Days' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleDateFilterChange(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  filter.dateRange === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sport & Market Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px] uppercase font-bold">Sport:</span>
              <select
                value={filter.sport}
                onChange={(e) => handleSportFilterChange(e.target.value as any)}
                className="bg-[#0B1020] border border-[#1E2D4A] text-white text-xs rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
              >
                <option value="all">All Sports</option>
                <option value="football">Football</option>
                <option value="basketball">Basketball</option>
                <option value="tennis">Tennis</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px] uppercase font-bold">Market:</span>
              <select
                value={filter.market}
                onChange={(e) => handleMarketFilterChange(e.target.value as any)}
                className="bg-[#0B1020] border border-[#1E2D4A] text-white text-xs rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
              >
                <option value="all">All Markets</option>
                <option value="1x2">1X2 Match Winner</option>
                <option value="over_under">Over/Under Goals</option>
                <option value="btts">Both Teams to Score</option>
                <option value="double_chance">Double Chance</option>
                <option value="dnb">Draw No Bet</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Win Rate */}
        <div className="p-5 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Prediction Win Rate
            </span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">
              {accuracy.winRate}%
            </span>
            <span className="text-xs text-slate-400">
              ({accuracy.correctSelections} / {accuracy.totalSettledSelections})
            </span>
          </div>
          <div className="w-full bg-[#0B1020] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, accuracy.winRate)}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-400 block pt-1">
            Excludes {accuracy.voidSelections} void & {accuracy.pendingSelections} pending selections
          </span>
        </div>

        {/* Realized ROI */}
        <div className="p-5 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Realized ROI
            </span>
            {financial.roi >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-black font-mono ${
                financial.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {financial.roi > 0 ? `+${financial.roi}%` : `${financial.roi}%`}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({financial.netProfit >= 0 ? '+' : ''}{formatMoney(financial.netProfit)})
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2">
            <span>Staked: {formatMoney(financial.totalStakes)}</span>
            <span>Returns: {formatMoney(financial.totalReturns)}</span>
          </div>
        </div>

        {/* Brier Score (Calibration Reliability) */}
        <div className="p-5 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Brier Loss Score
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                accuracy.brierRating === 'EXCELLENT'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : accuracy.brierRating === 'GOOD'
                  ? 'bg-blue-950 text-blue-300 border-blue-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              }`}
            >
              {accuracy.brierRating}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">
              {accuracy.brierScore.toFixed(3)}
            </span>
            <span className="text-[11px] text-slate-400">lower is better (ideal: ≤0.18)</span>
          </div>
          <p className="text-[11px] text-slate-400 pt-1 leading-snug">
            Quadratic probability calibration accuracy across settled predictions
          </p>
        </div>

        {/* Average Odds & Void Rate */}
        <div className="p-5 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Average Settled Odds
            </span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-400 font-mono">
              {financial.avgTicketOdds.toFixed(2)}x
            </span>
            <span className="text-xs text-slate-400">
              (leg avg: {financial.avgSelectionOdds.toFixed(2)}x)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2">
            <span>Profit Factor: {financial.profitFactor}x</span>
            <span>Void Frequency: {bettingFormats.voidLegFrequency}%</span>
          </div>
        </div>
      </div>

      {/* Probability Calibration Curve (The Core Calibration Feature) */}
      <div className="p-6 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E2D4A] pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Probability Calibration Reliability (Reliability Diagram)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Compares model-estimated probabilities with observed real-world win rates per confidence bucket.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
              <span className="text-slate-300">Model Predicted %</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-400 inline-block" />
              <span className="text-slate-300">Observed Win %</span>
            </span>
          </div>
        </div>

        {/* Calibration Buckets Bar Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {calibrationBuckets.map((bucket) => {
            const isWellCalibrated = Math.abs(bucket.difference) <= 5.0;
            return (
              <div
                key={bucket.bucket}
                className="p-4 rounded-xl bg-[#0B1020] border border-[#1E2D4A] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono">{bucket.bucket}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{bucket.count} picks</span>
                </div>

                <div className="space-y-2">
                  {/* Predicted Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                      <span>Predicted</span>
                      <span className="font-mono text-blue-400">
                        {Math.round(bucket.meanPredictedProbability * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-[#18233A] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{ width: `${Math.round(bucket.meanPredictedProbability * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Observed Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                      <span>Observed</span>
                      <span className="font-mono text-emerald-400">{bucket.observedWinRate}%</span>
                    </div>
                    <div className="w-full bg-[#18233A] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full"
                        style={{ width: `${Math.min(100, bucket.observedWinRate)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Delta Difference Indicator */}
                <div className="pt-1 flex items-center justify-between text-[11px] border-t border-[#1E2D4A]/50">
                  <span className="text-slate-500">Delta:</span>
                  <span
                    className={`font-mono font-bold ${
                      isWellCalibrated
                        ? 'text-emerald-400'
                        : bucket.difference > 0
                        ? 'text-blue-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {bucket.difference > 0 ? `+${bucket.difference}%` : `${bucket.difference}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Time Series Chart & Betting Format Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cumulative ROI & Performance Over Time */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Cumulative ROI & Win Rate Progression</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tracking returns over chronological match dates
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">{timeSeries.length} points</span>
          </div>

          {/* Simple Clean Responsive SVG Chart */}
          {timeSeries.length > 0 ? (
            <div className="space-y-4 pt-2">
              <div className="h-44 flex items-end gap-2 border-b border-slate-700/60 pb-2 px-2">
                {timeSeries.map((pt, idx) => {
                  const maxRoi = Math.max(...timeSeries.map((t) => Math.abs(t.cumulativeRoi)), 20);
                  const heightPercent = Math.min(100, Math.max(15, (Math.abs(pt.cumulativeRoi) / maxRoi) * 100));
                  const isPositive = pt.cumulativeRoi >= 0;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-[#0B1020] border border-[#1E2D4A] p-2 rounded-lg text-[10px] whitespace-nowrap z-20 pointer-events-none shadow-lg">
                        <div className="font-bold text-white">{pt.date}</div>
                        <div className="text-emerald-400">ROI: {pt.cumulativeRoi}%</div>
                        <div className="text-slate-300">Win Rate: {pt.cumulativeWinRate}%</div>
                        <div className="text-slate-400">Profit: {formatMoney(pt.cumulativeProfit)}</div>
                      </div>

                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          isPositive ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[9px] font-mono text-slate-500 rotate-45 origin-left truncate max-w-[3rem]">
                        {pt.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-2">
                <span>Start: {timeSeries[0]?.date}</span>
                <span className="text-emerald-400 font-bold">
                  Final Cumulative ROI: {timeSeries[timeSeries.length - 1]?.cumulativeRoi}%
                </span>
                <span>Latest: {timeSeries[timeSeries.length - 1]?.date}</span>
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-500 text-xs">
              No historical settled data within the selected filter window.
            </div>
          )}
        </div>

        {/* Betting Performance Formats (Singles vs Accas) */}
        <div className="p-6 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-4">
          <div className="border-b border-[#1E2D4A] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Singles vs Accumulators</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Structural betting breakdown</p>
          </div>

          <div className="space-y-3 text-xs">
            {/* Singles */}
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#1E2D4A] flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Singles</span>
                <span className="text-slate-500 text-[11px]">
                  {bettingFormats.singlesWon} won of {bettingFormats.singlesCount}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {bettingFormats.singlesWinRate}%
                </span>
                <span className="block text-[10px] text-slate-400">
                  ROI: {bettingFormats.singlesRoi}%
                </span>
              </div>
            </div>

            {/* Accumulators */}
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#1E2D4A] flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Accumulators</span>
                <span className="text-slate-500 text-[11px]">
                  {bettingFormats.accumulatorsWon} won of {bettingFormats.accumulatorsCount} (avg {bettingFormats.avgAccumulatorLegs} legs)
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-blue-400 text-sm">
                  {bettingFormats.accumulatorsWinRate}%
                </span>
                <span className="block text-[10px] text-slate-400">
                  ROI: {bettingFormats.accumulatorsRoi}%
                </span>
              </div>
            </div>

            {/* Odds Profile */}
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#1E2D4A] space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Winning Odds</span>
                <span className="font-mono font-bold text-emerald-400">
                  {bettingFormats.avgWinningOdds.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Losing Odds</span>
                <span className="font-mono font-bold text-rose-400">
                  {bettingFormats.avgLosingOdds.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Void Leg Frequency</span>
                <span className="font-mono font-bold text-amber-400">
                  {bettingFormats.voidLegFrequency}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Performance Breakdown Table */}
      <div className="p-6 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-4 shadow-xl">
        <div className="border-b border-[#1E2D4A] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Market Performance Matrix</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Empirical edge and financial returns segmented by betting market
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1E2D4A] text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Market</th>
                <th className="py-2.5 px-3 text-right">Settled</th>
                <th className="py-2.5 px-3 text-right">Won / Lost</th>
                <th className="py-2.5 px-3 text-right">Win Rate</th>
                <th className="py-2.5 px-3 text-right">Avg Odds</th>
                <th className="py-2.5 px-3 text-right">Net Profit</th>
                <th className="py-2.5 px-3 text-right">ROI (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2D4A]/50">
              {marketsPerformance.map((m) => (
                <tr key={m.market} className="hover:bg-[#18233A]/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-white">{m.market}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">{m.totalSelections}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                    <span className="text-emerald-400 font-bold">{m.wonSelections}</span> /{' '}
                    <span className="text-rose-400 font-bold">{m.lostSelections}</span>
                    {m.voidSelections > 0 && (
                      <span className="text-amber-400 ml-1">({m.voidSelections}v)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                    {m.winRate}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-purple-400 font-bold">
                    {m.avgOdds.toFixed(2)}x
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono font-bold ${
                      m.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {m.netProfit >= 0 ? '+' : ''}{formatMoney(m.netProfit)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono font-bold ${
                      m.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {m.roi >= 0 ? `+${m.roi}%` : `${m.roi}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confidence Band Performance Breakdown Table */}
      <div className="p-6 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-4 shadow-xl">
        <div className="border-b border-[#1E2D4A] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-400" />
            <span>Confidence-Band Accuracy & Brier Breakdown</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Calibration accuracy across model confidence intervals
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1E2D4A] text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Confidence Band</th>
                <th className="py-2.5 px-3 text-right">Picks</th>
                <th className="py-2.5 px-3 text-right">Won / Lost</th>
                <th className="py-2.5 px-3 text-right">Observed Win %</th>
                <th className="py-2.5 px-3 text-right">Brier Loss</th>
                <th className="py-2.5 px-3 text-right">Avg Odds</th>
                <th className="py-2.5 px-3 text-right">Realized ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2D4A]/50">
              {confidenceBands.map((band) => (
                <tr key={band.band} className="hover:bg-[#18233A]/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-white font-mono">{band.band}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">{band.totalSelections}</td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    <span className="text-emerald-400 font-bold">{band.wonSelections}</span> /{' '}
                    <span className="text-rose-400 font-bold">{band.lostSelections}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                    {band.winRate}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                    {band.brierScore.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-purple-400 font-bold">
                    {band.avgOdds.toFixed(2)}x
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono font-bold ${
                      band.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {band.roi >= 0 ? `+${band.roi}%` : `${band.roi}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Settled Predictions Audit Trail */}
      <div className="p-6 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Recent Settled Predictions Audit Log</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified historical picks with model estimated probabilities and full-time outcomes
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Showing latest {recentSettledPredictions.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1E2D4A] text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Fixture</th>
                <th className="py-2.5 px-3">Market & Pick</th>
                <th className="py-2.5 px-3 text-right">Model Prob</th>
                <th className="py-2.5 px-3 text-right">Odds</th>
                <th className="py-2.5 px-3 text-center">Score</th>
                <th className="py-2.5 px-3 text-right">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2D4A]/50">
              {recentSettledPredictions.map((rec) => (
                <tr key={rec.id} className="hover:bg-[#18233A]/40 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                    {rec.settledAt ? rec.settledAt.split('T')[0] : 'N/A'}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-white">
                    {rec.fixture}
                    {rec.competition && (
                      <span className="block text-[10px] text-slate-500">{rec.competition}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-blue-400 block">{rec.selection}</span>
                    <span className="text-[10px] text-slate-500">{rec.market}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-300">
                    {Math.round(rec.modelEstimatedProbability * 100)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                    {rec.odds.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                    {rec.score ? `${rec.score.home} - ${rec.score.away}` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                        rec.outcome === 'WON'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : rec.outcome === 'LOST'
                          ? 'bg-rose-950 text-rose-400 border-rose-800'
                          : 'bg-amber-950 text-amber-400 border-amber-800'
                      }`}
                    >
                      {rec.outcome === 'WON' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : rec.outcome === 'LOST' ? (
                        <XCircle className="w-3 h-3 text-rose-400" />
                      ) : (
                        <HelpCircle className="w-3 h-3 text-amber-400" />
                      )}
                      <span>{rec.outcome}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

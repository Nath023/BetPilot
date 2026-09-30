import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { RolloverTracker } from '../../../shared/types/index.ts';
import { storage } from '../../services/storage.ts';
import { BookmakerBadge } from '../common/Badges.tsx';
import {
  Percent,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Info,
} from 'lucide-react';

export const RolloverDashboard: React.FC = () => {
  const { formatMoney } = useAuth();
  const [rollovers, setRollovers] = useState<RolloverTracker[]>(() => storage.getRollovers());
  const [activeTrackerId, setActiveTrackerId] = useState<string>(() => rollovers[0]?.id || '');

  // Add wager modal state
  const [isAddingWager, setIsAddingWager] = useState(false);
  const [wagerAmount, setWagerAmount] = useState('50000');

  // Create new rollover tracker state
  const [isCreating, setIsCreating] = useState(false);
  const [newBookmaker, setNewBookmaker] = useState('SportyBet');
  const [newBonus, setNewBonus] = useState('100000');
  const [newMultiplier, setNewMultiplier] = useState('5');
  const [newMinOdds, setNewMinOdds] = useState('1.50');
  const [newMinLegs, setNewMinLegs] = useState('3');

  const activeTracker = rollovers.find((r) => r.id === activeTrackerId) || rollovers[0];

  const handleAddWager = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTracker) return;
    const amount = parseFloat(wagerAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newCompleted = activeTracker.completedWager + amount;
    const required = activeTracker.requiredWager;
    const remaining = Math.max(0, required - newCompleted);
    const progress = Math.min(100, Math.round((newCompleted / required) * 100));

    const updated: RolloverTracker = {
      ...activeTracker,
      completedWager: newCompleted,
      remainingWager: remaining,
      progressPercentage: progress,
      status: remaining === 0 ? 'COMPLETED' : 'ACTIVE',
      updatedAt: new Date().toISOString(),
    };

    storage.saveRollover(updated);
    setRollovers(storage.getRollovers());
    setIsAddingWager(false);
    setWagerAmount('50000');
  };

  const handleCreateTracker = (e: React.FormEvent) => {
    e.preventDefault();
    const bonus = parseFloat(newBonus);
    const mult = parseFloat(newMultiplier);
    if (isNaN(bonus) || isNaN(mult) || bonus <= 0 || mult <= 0) return;

    const req = bonus * mult;
    const tracker: RolloverTracker = {
      id: `rollover-${Date.now()}`,
      bookmaker: newBookmaker,
      bonusAmount: bonus,
      currency: 'NGN',
      rolloverMultiplier: mult,
      requiredWager: req,
      completedWager: 0,
      remainingWager: req,
      progressPercentage: 0,
      minOddsPerTicket: parseFloat(newMinOdds) || 1.5,
      minSelectionsPerTicket: parseInt(newMinLegs, 10) || 3,
      qualifyingRules: [
        `Minimum ${newMinLegs} selections per qualifying ticket`,
        `Minimum combined odds of ${newMinOdds}`,
        'System bets and cashed-out bets excluded',
      ],
      startDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    };

    storage.saveRollover(tracker);
    const updatedList = storage.getRollovers();
    setRollovers(updatedList);
    setActiveTrackerId(tracker.id);
    setIsCreating(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#0B1020]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Percent className="w-5 h-5 text-blue-400" />
            Bonus Rollover Tracker
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor wagering requirements, qualifying accumulator criteria, and real bonus clearance progress.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Bonus Tracker</span>
        </button>
      </div>

      {/* Tracker selector pills if multiple */}
      {rollovers.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {rollovers.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveTrackerId(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                activeTracker?.id === r.id
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/60'
                  : 'bg-[#121A2B] text-slate-400 border-[#1E2D4A] hover:text-white'
              }`}
            >
              {r.bookmaker} ({r.progressPercentage}%)
            </button>
          ))}
        </div>
      )}

      {/* Main Active Tracker Card */}
      {activeTracker ? (
        <div className="p-6 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1E2D4A]">
            <div className="flex items-center gap-3">
              <BookmakerBadge bookmaker={activeTracker.bookmaker} />
              <div>
                <h2 className="text-base font-bold text-white">
                  {activeTracker.bookmaker} Welcome Bonus
                </h2>
                <span className="text-xs text-slate-400">
                  {activeTracker.rolloverMultiplier}x Rollover Requirement
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold border ${
                  activeTracker.status === 'COMPLETED'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-blue-950 text-blue-400 border-blue-800'
                }`}
              >
                {activeTracker.status === 'COMPLETED' ? 'Unlocked & Clear' : 'In Progress'}
              </span>

              <button
                onClick={() => setIsAddingWager(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Wagered Ticket</span>
              </button>
            </div>
          </div>

          {/* Progress Bar & Big Percent */}
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Wagered so far:</span>
                <div className="text-2xl font-black text-white font-mono">
                  {formatMoney(activeTracker.completedWager)}{' '}
                  <span className="text-sm font-normal text-slate-400">
                    / {formatMoney(activeTracker.requiredWager)}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-3xl font-black text-emerald-400 font-mono">
                  {activeTracker.progressPercentage}%
                </span>
              </div>
            </div>

            {/* Custom progress visual */}
            <div className="w-full h-3 bg-[#0B1020] rounded-full overflow-hidden border border-[#1E2D4A]">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${activeTracker.progressPercentage}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-slate-400 pt-1">
              <span>{formatMoney(activeTracker.remainingWager)} remaining to unlock withdrawal</span>
              <span>Expires: {new Date(activeTracker.expiryDate || '').toLocaleDateString()}</span>
            </div>
          </div>

          {/* Key Metrics Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#1E2D4A]">
              <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                Bonus Granted
              </span>
              <span className="text-lg font-bold text-white font-mono">
                {formatMoney(activeTracker.bonusAmount)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#1E2D4A]">
              <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                Wager Target (4x)
              </span>
              <span className="text-lg font-bold text-white font-mono">
                {formatMoney(activeTracker.requiredWager)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#1E2D4A]">
              <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                Min Leg Count
              </span>
              <span className="text-lg font-bold text-blue-400 font-mono">
                {activeTracker.minSelectionsPerTicket || 3}+ folds
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#1E2D4A]">
              <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                Min Ticket Odds
              </span>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                {activeTracker.minOddsPerTicket ? `${activeTracker.minOddsPerTicket.toFixed(2)}x` : '1.50x'}
              </span>
            </div>
          </div>

          {/* Qualification Rules Box */}
          <div className="p-4 rounded-xl bg-[#0B1020] border border-[#1E2D4A] space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              Verified Qualifying Rules
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              {activeTracker.qualifyingRules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500 rounded-xl bg-[#121A2B] border border-[#1E2D4A]">
          No active rollover tracker found.
        </div>
      )}

      {/* Log Wager Modal */}
      {isAddingWager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <form
            onSubmit={handleAddWager}
            className="w-full max-w-md bg-[#121A2B] border border-[#1E2D4A] rounded-xl p-5 space-y-4"
          >
            <h3 className="text-base font-bold text-white">Log Settled Bet to Rollover</h3>
            <p className="text-xs text-slate-400">
              Enter the stake amount of your qualifying settled bet to record progress.
            </p>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Stake Contributed (₦):
              </label>
              <input
                type="number"
                required
                min="100"
                value={wagerAmount}
                onChange={(e) => setWagerAmount(e.target.value)}
                className="w-full bg-[#0B1020] border border-[#1E2D4A] text-emerald-400 font-mono font-bold text-sm rounded-lg p-2.5 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingWager(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                Log Wager
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Tracker Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <form
            onSubmit={handleCreateTracker}
            className="w-full max-w-lg bg-[#121A2B] border border-[#1E2D4A] rounded-xl p-5 space-y-4"
          >
            <h3 className="text-base font-bold text-white">Track New Bonus Requirement</h3>
            <p className="text-xs text-slate-400">
              Set up a transparent tracker based on your bookmaker's promotional terms.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Bookmaker</label>
                <select
                  value={newBookmaker}
                  onChange={(e) => setNewBookmaker(e.target.value)}
                  className="w-full bg-[#0B1020] border border-[#1E2D4A] text-white rounded-lg p-2 outline-none"
                >
                  <option value="SportyBet">SportyBet</option>
                  <option value="Bet9ja">Bet9ja</option>
                  <option value="1xBet">1xBet</option>
                  <option value="BetKing">BetKing</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Bonus Amount (₦)</label>
                <input
                  type="number"
                  required
                  value={newBonus}
                  onChange={(e) => setNewBonus(e.target.value)}
                  className="w-full bg-[#0B1020] border border-[#1E2D4A] text-white font-mono rounded-lg p-2 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Rollover Multiplier</label>
                <input
                  type="number"
                  required
                  step="0.5"
                  value={newMultiplier}
                  onChange={(e) => setNewMultiplier(e.target.value)}
                  className="w-full bg-[#0B1020] border border-[#1E2D4A] text-white font-mono rounded-lg p-2 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Min Ticket Odds</label>
                <input
                  type="number"
                  step="0.05"
                  value={newMinOdds}
                  onChange={(e) => setNewMinOdds(e.target.value)}
                  className="w-full bg-[#0B1020] border border-[#1E2D4A] text-white font-mono rounded-lg p-2 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                Create Tracker
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

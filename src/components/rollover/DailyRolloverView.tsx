import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { CandidateSlip, DailyRolloverChallenge, CandidateSelection } from '../../../shared/types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTicket } from '../../context/TicketContext.tsx';
import {
  Calendar,
  Sparkles,
  Layers,
  CheckCircle,
  Plus,
  Trash2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Check,
  Edit3,
} from 'lucide-react';

export const DailyRolloverView: React.FC = () => {
  const { formatMoney } = useAuth();
  const { activeTicket, updateActiveTicket, setPendingAction } = useTicket();

  const [challenge, setChallenge] = useState<DailyRolloverChallenge | null>(null);
  const [candidateSlips, setCandidateSlips] = useState<CandidateSlip[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<CandidateSlip | null>(null);
  const [generating, setGenerating] = useState(false);
  const [safetyNotice, setSafetyNotice] = useState<string | null>(null);

  // Outcome recording state
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordStatus, setRecordStatus] = useState<'WON' | 'LOST' | 'VOID'>('WON');
  const [recordNotes, setRecordNotes] = useState('');

  // Slip Builder stake state
  const [builderStake, setBuilderStake] = useState('10000');

  useEffect(() => {
    loadChallenge();
    handleGenerateSlips();
  }, []);

  const loadChallenge = async () => {
    try {
      const res = await api.getDailyRollover();
      if (res.success && res.challenge) {
        setChallenge(res.challenge);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateSlips = async () => {
    setGenerating(true);
    setSafetyNotice(null);
    try {
      const res = await api.generateDailyRollover({
        targetOddsMin: 4.0,
        targetOddsMax: 5.0,
      });

      if (res.success && res.candidateSlips) {
        setCandidateSlips(res.candidateSlips);
        setSelectedSlip(res.candidateSlips[0]);
        if (res.safetyWarning) setSafetyNotice(res.safetyWarning);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleUseSlipInBuilder = (slip: CandidateSlip) => {
    setSelectedSlip(slip);
  };

  const handleRemoveBuilderSelection = (selectionId: string) => {
    if (!selectedSlip) return;
    const filtered = selectedSlip.selections.filter((s) => s.id !== selectionId);
    const newCombined = filtered.reduce((acc, s) => acc * s.bookmakerOdds, 1.0);

    setSelectedSlip({
      ...selectedSlip,
      selections: filtered,
      combinedOdds: Math.round(newCombined * 100) / 100,
    });
  };

  const handleSaveAsDailyRollover = () => {
    if (!selectedSlip) return;

    setPendingAction({
      id: `action-rollover-${Date.now()}`,
      type: 'UPDATE_ROLLOVER',
      title: `Save ${selectedSlip.title} as Today's Rollover?`,
      description: `Commit this slip for Day ${challenge?.currentDay || 1} with combined odds of ${selectedSlip.combinedOdds.toFixed(2)}x and stake ${formatMoney(parseFloat(builderStake) || 10000)}.`,
      requiresConfirmation: true,
      status: 'CONFIRMATION_REQUIRED',
      beforeSummary: {
        activeDay: `Day ${challenge?.currentDay || 1}`,
        targetOdds: '4.00 - 5.00',
      },
      afterSummary: {
        chosenSlip: selectedSlip.title,
        combinedOdds: `${selectedSlip.combinedOdds.toFixed(2)}x`,
        legsCount: selectedSlip.selections.length,
      },
      payload: async () => {
        await api.recordRolloverDay({
          date: new Date().toISOString().split('T')[0],
          dayNumber: challenge?.currentDay || 1,
          slip: selectedSlip,
          stake: parseFloat(builderStake) || 10000,
          status: 'READY',
          notes: selectedSlip.rationale,
        });
        loadChallenge();
      },
    });
  };

  const handleRecordOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;

    await api.recordRolloverDay({
      date: new Date().toISOString().split('T')[0],
      dayNumber: challenge.currentDay,
      status: recordStatus,
      stake: parseFloat(builderStake) || 10000,
      notes: recordNotes,
    });

    setRecordModalOpen(false);
    loadChallenge();
  };

  const stakeNum = parseFloat(builderStake) || 10000;
  const potentialPayout = selectedSlip ? Math.round(stakeNum * selectedSlip.combinedOdds) : 0;
  const potentialProfit = potentialPayout - stakeNum;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#0B1020]">
      {/* 10-Day Rollover Progression Header (Section 19) */}
      {challenge && (
        <div className="p-6 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2D4A] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800">
                  {challenge.status}
                </span>
                <h1 className="text-base sm:text-lg font-bold text-white">{challenge.title}</h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Target: {challenge.dailyTargetOddsMin.toFixed(2)} - {challenge.dailyTargetOddsMax.toFixed(2)} odds per day • Multiplier: {challenge.targetMultiplier}x
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRecordModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Record Day {challenge.currentDay} Outcome
              </button>
            </div>
          </div>

          {/* Bankroll Progress Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#1E2D4A]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Starting Bankroll</span>
              <span className="text-base font-bold text-white font-mono">{formatMoney(challenge.startingBankroll)}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#1E2D4A]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Current Bankroll</span>
              <span className="text-base font-black text-emerald-400 font-mono">{formatMoney(challenge.currentBankroll)}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#1E2D4A]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Bankroll (10x)</span>
              <span className="text-base font-bold text-purple-400 font-mono">{formatMoney(challenge.targetAmount)}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#1E2D4A]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Current Day</span>
              <span className="text-base font-bold text-blue-400 font-mono">
                Day {challenge.currentDay} of {challenge.totalDays}
              </span>
            </div>
          </div>

          {/* 10 Days Progress Pills */}
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
            {challenge.days.map((day) => (
              <div
                key={day.dayNumber}
                className={`p-2 rounded-lg text-center border text-[11px] font-mono ${
                  day.status === 'WON'
                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                    : day.status === 'LOST'
                    ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                    : day.status === 'READY'
                    ? 'bg-blue-950/80 border-blue-600 text-blue-300 ring-1 ring-blue-500/50'
                    : 'bg-[#0B1020] border-[#1E2D4A] text-slate-500'
                }`}
              >
                <div className="font-bold">D{day.dayNumber}</div>
                <div className="text-[9px] uppercase tracking-wider">{day.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Warning Notice if high target odds required compromise */}
      {safetyNotice && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{safetyNotice}</span>
        </div>
      )}

      {/* Section: Candidate Slips (Section 18 & 39) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Today's Candidate Slips (Target 4.00 – 5.00 Odds)
            </h2>
            <p className="text-xs text-slate-400">
              Evaluated with zero intra-match correlation and strict empirical distributions.
            </p>
          </div>

          <button
            onClick={handleGenerateSlips}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18233A] hover:bg-[#1E2D4A] text-slate-200 text-xs font-semibold border border-[#1E2D4A] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>{generating ? 'Researching Fixtures...' : 'Re-Generate Slips'}</span>
          </button>
        </div>

        {/* Slips Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {candidateSlips.map((slip, idx) => {
            const isChosen = selectedSlip?.id === slip.id;
            return (
              <div
                key={slip.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isChosen
                    ? 'bg-[#121A2B] border-blue-500 shadow-lg ring-1 ring-blue-500/50'
                    : 'bg-[#121A2B]/70 border-[#1E2D4A] hover:border-slate-600'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-[#1E2D4A] pb-2">
                    <div>
                      <h3 className="text-xs font-bold text-white">{slip.title}</h3>
                      <span className="text-[10px] text-slate-400">{slip.selections.length} selections • Data: {slip.dataQuality}</span>
                    </div>
                    <span className="text-sm font-mono font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                      {slip.combinedOdds.toFixed(2)}x
                    </span>
                  </div>

                  {/* Selections List */}
                  <div className="space-y-1.5 text-xs">
                    {slip.selections.map((sel, i) => (
                      <div
                        key={sel.id || i}
                        className="p-2 rounded-lg bg-[#0B1020] border border-[#1E2D4A] flex items-center justify-between"
                      >
                        <div className="truncate mr-2">
                          <div className="font-semibold text-white truncate">
                            {sel.homeTeam} vs {sel.awayTeam}
                          </div>
                          <div className="text-[10px] text-blue-400">{sel.selection}</div>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-300">
                          {sel.bookmakerOdds.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-400 italic leading-relaxed pt-1">
                    {slip.rationale}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#1E2D4A] mt-3">
                  <button
                    onClick={() => handleUseSlipInBuilder(slip)}
                    className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      isChosen
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-[#18233A] text-slate-300 hover:text-white hover:bg-[#1E2D4A] border border-[#1E2D4A]'
                    }`}
                  >
                    {isChosen ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                    <span>{isChosen ? 'Loaded in Slip Builder' : 'Select for Builder'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dedicated Slip Builder (Section 34 & 39) */}
      {selectedSlip && (
        <div className="p-6 rounded-2xl bg-[#121A2B] border border-blue-500/50 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2D4A] pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Slip Builder — {selectedSlip.title}
              </h2>
              <span className="text-xs text-slate-400">
                Customize selections, modify your stake, and save directly to Day {challenge?.currentDay || 1}.
              </span>
            </div>

            <span className="text-xl font-mono font-black text-emerald-400 bg-emerald-950 px-3 py-1 rounded-lg border border-emerald-800">
              {selectedSlip.combinedOdds.toFixed(2)}x Combined Odds
            </span>
          </div>

          {/* Builder selections table */}
          <div className="space-y-2">
            {selectedSlip.selections.map((sel, idx) => (
              <div
                key={sel.id}
                className="p-3 rounded-xl bg-[#0B1020] border border-[#1E2D4A] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">
                    {sel.homeTeam} vs {sel.awayTeam}
                  </div>
                  <div className="text-[11px] text-blue-400">
                    {sel.selection} ({sel.market}) • Model Edge: +{sel.edgePercentage.toFixed(1)}%
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-emerald-400 bg-slate-900 px-2 py-1 rounded">
                    {sel.bookmakerOdds.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleRemoveBuilderSelection(sel.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remove from slip"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Stake & Return Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#0B1020] border border-[#1E2D4A] text-xs">
            <div>
              <label htmlFor="rollover-stake-input" className="text-slate-400 font-semibold block mb-1">Day Stake (₦):</label>
              <input
                id="rollover-stake-input"
                type="number"
                value={builderStake}
                onChange={(e) => setBuilderStake(e.target.value)}
                className="w-full bg-[#121A2B] border border-[#1E2D4A] text-white font-mono font-bold rounded-lg p-2 outline-none"
              />
            </div>
            <div>
              <span className="text-slate-400 font-semibold block mb-1">Potential Payout:</span>
              <span className="text-lg font-mono font-black text-emerald-400">
                {formatMoney(potentialPayout)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block mb-1">Potential Net Profit:</span>
              <span className="text-lg font-mono font-bold text-white">
                {formatMoney(potentialProfit)}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleSaveAsDailyRollover}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-colors cursor-pointer flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Save as Today's Rollover</span>
            </button>
          </div>
        </div>
      )}

      {/* Outcome Recording Modal */}
      {recordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <form
            onSubmit={handleRecordOutcomeSubmit}
            className="w-full max-w-md bg-[#121A2B] border border-[#1E2D4A] rounded-xl p-5 space-y-4"
          >
            <h3 className="text-base font-bold text-white">
              Record Day {challenge?.currentDay || 1} Outcome
            </h3>
            <p className="text-xs text-slate-400">
              Manual verification: Confirm match settlement to update bankroll progression.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Status</label>
                <select
                  value={recordStatus}
                  onChange={(e) => setRecordStatus(e.target.value as any)}
                  className="w-full bg-[#0B1020] border border-[#1E2D4A] text-white rounded-lg p-2.5 outline-none"
                >
                  <option value="WON">WON (Collect returns & advance day)</option>
                  <option value="LOST">LOST (Deduct stake & reset/evaluate)</option>
                  <option value="VOID">VOID (Refunded stake)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Notes / Match Observations</label>
                <textarea
                  rows={2}
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  placeholder="e.g. 4/4 legs hit cleanly with late Arsenal second goal..."
                  className="w-full bg-[#0B1020] border border-[#1E2D4A] text-white rounded-lg p-2 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                Save Outcome
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

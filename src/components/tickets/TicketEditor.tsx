import React, { useState } from 'react';
import { useTicket } from '../../context/TicketContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { BookmakerBadge, DataSourceBadge, ConfidenceBadge } from '../common/Badges.tsx';
import { Selection } from '../../../shared/types/index.ts';
import { REGISTERED_BOOKMAKERS } from '../../../shared/constants/bookmakers.ts';
import { api } from '../../services/api.ts';
import {
  Ticket as TicketIcon,
  Plus,
  Trash2,
  Scissors,
  Layers,
  Repeat,
  Save,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  Calculator,
} from 'lucide-react';

export const TicketEditor: React.FC = () => {
  const {
    activeTicket,
    updateActiveTicket,
    updateSelection,
    removeSelection,
    addSelection,
    saveCurrentTicket,
    setPendingAction,
  } = useTicket();
  const { formatMoney } = useAuth();

  const [isAddingLeg, setIsAddingLeg] = useState(false);
  const [newHome, setNewHome] = useState('');
  const [newAway, setNewAway] = useState('');
  const [newMarket, setNewMarket] = useState('1X2');
  const [newSelection, setNewSelection] = useState('Home Win');
  const [newOdds, setNewOdds] = useState('1.50');

  const [targetBookmaker, setTargetBookmaker] = useState('bet9ja');
  const [copied, setCopied] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  if (!activeTicket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-4">
        <TicketIcon className="w-12 h-12 text-slate-600" />
        <h3 className="text-base font-bold text-white">No Active Ticket Selected</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Please upload a ticket screenshot in the AI Copilot or select a saved ticket from your library.
        </p>
      </div>
    );
  }

  const handleAddLeg = (e: React.FormEvent) => {
    e.preventDefault();
    const oddsNum = parseFloat(newOdds);
    if (!newHome.trim() || !newAway.trim() || isNaN(oddsNum) || oddsNum <= 1.0) {
      alert('Please enter valid team names and odds greater than 1.00');
      return;
    }

    addSelection({
      homeTeam: newHome.trim(),
      awayTeam: newAway.trim(),
      market: newMarket,
      selection: newSelection,
      odds: oddsNum,
      confidence: 1.0,
      source: 'USER_PROVIDED',
    });

    setNewHome('');
    setNewAway('');
    setNewOdds('1.50');
    setIsAddingLeg(false);
    setStatusNotice('Leg added successfully');
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleTrimQuick = async () => {
    const res = await api.runTool('trim_ticket', {
      ticket: activeTicket,
      criteria: {
        maxSelections: Math.max(1, activeTicket.selections.length - 2),
        removeHighestOdds: true,
      },
    });

    if (res.proposedAction) {
      setPendingAction(res.proposedAction);
    }
  };

  const handleSplitQuick = async (method: 'doubles' | 'trebles') => {
    const res = await api.runTool('split_ticket', {
      ticket: activeTicket,
      method,
      allocatedStakePerTicket: 500,
    });

    if (res.proposedAction) {
      setPendingAction(res.proposedAction);
    }
  };

  const handleConvert = async () => {
    const res = await api.runTool('convert_ticket', {
      ticket: activeTicket,
      targetBookmaker,
    });

    if (res.success && res.convertedTicket) {
      updateActiveTicket(res.convertedTicket);
      setStatusNotice(`Ticket converted to ${targetBookmaker}. Selections preserved semantically.`);
      setTimeout(() => setStatusNotice(null), 4000);
    }
  };

  const handleCopyTicket = () => {
    const text = `BetPilot AI Ticket (${activeTicket.bookmaker})\n` +
      `Combined Odds: ${activeTicket.totalOdds.toFixed(2)}\n` +
      activeTicket.selections
        .map((s, i) => `${i + 1}. ${s.homeTeam} vs ${s.awayTeam} | ${s.selection} @ ${s.odds}`)
        .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#0B1020]">
      {/* Top Banner / Notification */}
      {statusNotice && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 animate-in fade-in">
          {statusNotice}
        </div>
      )}

      {/* Ticket Header & Stats Card */}
      <div className="p-5 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BookmakerBadge bookmaker={activeTicket.bookmaker} />
            <h1 className="text-lg font-bold text-white">
              {activeTicket.title || `${activeTicket.bookmaker} Ticket`}
            </h1>
            {activeTicket.bookingCode && (
              <span className="text-xs font-mono bg-[#0B1020] text-slate-300 px-2.5 py-1 rounded-md border border-[#1E2D4A]">
                Code: {activeTicket.bookingCode}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTicket}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18233A] hover:bg-[#1E2D4A] text-slate-200 text-xs font-medium border border-[#1E2D4A] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Selections'}</span>
            </button>
            <button
              onClick={() => {
                saveCurrentTicket();
                setStatusNotice('Ticket saved to library');
                setTimeout(() => setStatusNotice(null), 3000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Ticket</span>
            </button>
          </div>
        </div>

        {/* Big Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#1E2D4A]">
            <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
              Combined Decimal Odds
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {activeTicket.totalOdds.toFixed(2)}x
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#1E2D4A]">
            <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
              Implied Probability
            </span>
            <span className="text-2xl font-black text-blue-400 font-mono">
              {(activeTicket.impliedProbability * 100).toFixed(2)}%
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#1E2D4A]">
            <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
              Stake Amount
            </span>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-mono">₦</span>
              <input
                type="number"
                value={activeTicket.stake || ''}
                onChange={(e) => updateActiveTicket({ stake: parseFloat(e.target.value) || 0 })}
                className="w-full bg-transparent font-mono font-bold text-xl text-white outline-none"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#1E2D4A]">
            <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
              Potential Return
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {formatMoney(activeTicket.potentialReturn)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Toolbar (Trim, Split, Convert) */}
      <div className="p-4 rounded-xl bg-[#121A2B] border border-[#1E2D4A] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
            Transformations:
          </span>

          <button
            onClick={handleTrimQuick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18233A] hover:bg-[#1E2D4A] text-slate-200 text-xs font-medium border border-[#1E2D4A] transition-colors cursor-pointer"
            title="Trim longest-odds legs to reduce accumulator variance"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Trim Risky Legs</span>
          </button>

          <button
            onClick={() => handleSplitQuick('doubles')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18233A] hover:bg-[#1E2D4A] text-slate-200 text-xs font-medium border border-[#1E2D4A] transition-colors cursor-pointer"
            title="Split into doubles combination bets"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Split into Doubles</span>
          </button>

          <button
            onClick={() => handleSplitQuick('trebles')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18233A] hover:bg-[#1E2D4A] text-slate-200 text-xs font-medium border border-[#1E2D4A] transition-colors cursor-pointer"
            title="Split into trebles combination bets"
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Split into Trebles</span>
          </button>
        </div>

        {/* Bookmaker Conversion Bar */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Convert to:</span>
          <select
            value={targetBookmaker}
            onChange={(e) => setTargetBookmaker(e.target.value)}
            className="bg-[#0B1020] border border-[#1E2D4A] text-white text-xs rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
          >
            {REGISTERED_BOOKMAKERS.filter(
              (b) => b.name.toLowerCase() !== activeTicket.bookmaker.toLowerCase()
            ).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleConvert}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#18233A] hover:bg-[#1E2D4A] text-slate-200 text-xs font-medium border border-[#1E2D4A] cursor-pointer"
          >
            <Repeat className="w-3.5 h-3.5 text-emerald-400" />
            <span>Convert</span>
          </button>
        </div>
      </div>

      {/* Selections Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Selections ({activeTicket.selections.length})
          </h2>
          <button
            onClick={() => setIsAddingLeg(!isAddingLeg)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Selection</span>
          </button>
        </div>

        {/* Add Leg Form Modal / Collapsible */}
        {isAddingLeg && (
          <form
            onSubmit={handleAddLeg}
            className="p-4 rounded-xl bg-[#18233A] border border-blue-500/40 space-y-3 animate-in fade-in"
          >
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Add New Selection Leg
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Home Team</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arsenal"
                  value={newHome}
                  onChange={(e) => setNewHome(e.target.value)}
                  className="w-full bg-[#0B1020] border border-[#1E2D4A] text-white text-xs rounded-lg px-2.5 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Away Team</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chelsea"
                  value={newAway}
                  onChange={(e) => setNewAway(e.target.value)}
                  className="w-full bg-[#0B1020] border border-[#1E2D4A] text-white text-xs rounded-lg px-2.5 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Market</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1X2 or Over/Under"
                  value={newMarket}
                  onChange={(e) => setNewMarket(e.target.value)}
                  className="w-full bg-[#0B1020] border border-[#1E2D4A] text-white text-xs rounded-lg px-2.5 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Selection Pick</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Home Win"
                  value={newSelection}
                  onChange={(e) => setNewSelection(e.target.value)}
                  className="w-full bg-[#0B1020] border border-[#1E2D4A] text-white text-xs rounded-lg px-2.5 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Decimal Odds</label>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  required
                  value={newOdds}
                  onChange={(e) => setNewOdds(e.target.value)}
                  className="w-full bg-[#0B1020] border border-[#1E2D4A] text-emerald-400 font-mono font-bold text-xs rounded-lg px-2.5 py-1.5 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingLeg(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                Save Leg
              </button>
            </div>
          </form>
        )}

        {/* Selections List */}
        <div className="space-y-2">
          {activeTicket.selections.map((sel, idx) => (
            <div
              key={sel.id}
              className="p-4 rounded-xl bg-[#121A2B] border border-[#1E2D4A] hover:border-slate-600 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 font-mono">#{idx + 1}</span>
                  <span className="text-sm font-bold text-white">
                    {sel.homeTeam} <span className="text-slate-500 font-normal">vs</span> {sel.awayTeam}
                  </span>
                  {sel.competition && (
                    <span className="text-[10px] text-slate-400 bg-[#0B1020] px-2 py-0.5 rounded border border-[#1E2D4A]">
                      {sel.competition}
                    </span>
                  )}
                  <ConfidenceBadge confidence={sel.confidence} />
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="text-blue-400 font-medium">{sel.selection}</span>
                  <span>•</span>
                  <span>{sel.market}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-500">
                    Implied: {(100 / sel.odds).toFixed(1)}%
                  </span>
                </div>

                {sel.uncertainFields && sel.uncertainFields.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400 pt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Uncertain extraction field. Please verify odds accuracy.</span>
                  </div>
                )}
              </div>

              {/* Odds Input & Delete Action */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-[#0B1020] px-3 py-1.5 rounded-lg border border-[#1E2D4A]">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Odds:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    value={sel.odds}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        updateSelection(sel.id, { odds: val });
                      }
                    }}
                    className="w-16 bg-transparent text-emerald-400 font-mono font-bold text-sm outline-none text-right"
                  />
                </div>

                <button
                  onClick={() => removeSelection(sel.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-[#18233A] rounded-lg transition-colors cursor-pointer"
                  title="Remove leg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

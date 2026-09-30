import React, { useState } from 'react';
import { useTicket } from '../../context/TicketContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { BookmakerBadge, DataSourceBadge, ConfidenceBadge } from '../common/Badges.tsx';
import {
  Ticket as TicketIcon,
  Trash2,
  Scissors,
  Layers,
  Save,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';

interface ActiveTicketPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToWorkspace: () => void;
}

export const ActiveTicketPanel: React.FC<ActiveTicketPanelProps> = ({
  isOpen,
  onClose,
  onNavigateToWorkspace,
}) => {
  const { activeTicket, updateActiveTicket, removeSelection, saveCurrentTicket, setPendingAction } = useTicket();
  const { formatMoney } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    updateActiveTicket({ stake: isNaN(val) ? 0 : val });
  };

  const handleCopyTicket = () => {
    if (!activeTicket) return;
    const text = `BetPilot AI Ticket (${activeTicket.bookmaker})\n` +
      `Total Odds: ${activeTicket.totalOdds.toFixed(2)}\n` +
      activeTicket.selections
        .map(
          (s, i) =>
            `${i + 1}. ${s.homeTeam} vs ${s.awayTeam} | ${s.selection} @ ${s.odds}`
        )
        .join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-80 lg:w-96 bg-[#121A2B] border-l border-[#1E2D4A] flex flex-col h-[calc(100vh-3.5rem)] z-30 shrink-0">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-[#1E2D4A] flex items-center justify-between bg-[#18233A]">
        <div className="flex items-center gap-2">
          <TicketIcon className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Active Ticket Inspector
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onNavigateToWorkspace}
            className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-[#1E2D4A] flex items-center gap-1 cursor-pointer"
            title="Open in full workspace"
          >
            Workspace <ExternalLink className="w-3 h-3" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1E2D4A] cursor-pointer"
            title="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ticket Body */}
      {activeTicket ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Card Summary Header */}
          <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#1E2D4A] space-y-3">
            <div className="flex items-center justify-between">
              <BookmakerBadge bookmaker={activeTicket.bookmaker} />
              <div className="flex items-center gap-2">
                {activeTicket.bookingCode && (
                  <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {activeTicket.bookingCode}
                  </span>
                )}
                <DataSourceBadge status={activeTicket.source} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white truncate">
                {activeTicket.title || `${activeTicket.bookmaker} Ticket`}
              </h3>
              <span className="text-[11px] text-slate-400">
                {activeTicket.selections.length} selections • Combined Decimal Odds
              </span>
            </div>

            {/* Odds & Calculations Box */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1E2D4A]/80">
              <div className="bg-[#121A2B] p-2.5 rounded-lg border border-[#1E2D4A]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Combined Odds
                </span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {activeTicket.totalOdds.toFixed(2)}x
                </span>
              </div>

              <div className="bg-[#121A2B] p-2.5 rounded-lg border border-[#1E2D4A]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Implied Probability
                </span>
                <span className="text-lg font-bold text-blue-400 font-mono">
                  {(activeTicket.impliedProbability * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Stake & Return Inputs */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="stake-input" className="text-slate-400 font-medium">Stake Amount:</label>
                <div className="flex items-center gap-1 bg-[#121A2B] px-2 py-1 rounded-md border border-[#1E2D4A] focus-within:border-blue-500">
                  <span className="text-slate-500 text-xs font-mono">₦</span>
                  <input
                    id="stake-input"
                    type="number"
                    value={activeTicket.stake || ''}
                    onChange={handleStakeChange}
                    className="w-20 bg-transparent text-white font-mono text-xs font-bold outline-none text-right"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#1E2D4A]/60">
                <span className="text-slate-400">Potential Return:</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {formatMoney(activeTicket.potentialReturn)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Potential Profit:</span>
                <span className="text-slate-300 font-mono font-semibold">
                  {formatMoney(activeTicket.potentialProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Selections List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Selections ({activeTicket.selections.length})
              </span>
              <button
                onClick={handleCopyTicket}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {activeTicket.selections.map((sel, idx) => (
              <div
                key={sel.id || idx}
                className="p-3 rounded-lg bg-[#0B1020] border border-[#1E2D4A] hover:border-slate-600 transition-colors group relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white">
                      {sel.homeTeam} <span className="text-slate-500 font-normal">vs</span> {sel.awayTeam}
                    </div>
                    <div className="text-[11px] text-blue-400 font-medium">
                      {sel.selection}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {sel.market} {sel.competition ? `• ${sel.competition}` : ''}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900/60">
                      {sel.odds.toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeSelection(sel.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity cursor-pointer"
                      title="Remove selection"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {sel.uncertainFields && sel.uncertainFields.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#1E2D4A] flex items-center gap-1.5 text-[10px] text-amber-300">
                    <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Uncertain extraction: verify odds or team name</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
          <TicketIcon className="w-10 h-10 text-slate-600" />
          <p className="text-xs">No active ticket in inspector.</p>
          <p className="text-[11px] text-slate-400">
            Upload a screenshot or click a demo benchmark to inspect selections.
          </p>
        </div>
      )}

      {/* Footer Quick Action Buttons */}
      {activeTicket && (
        <div className="p-3 border-t border-[#1E2D4A] bg-[#0B1020] grid grid-cols-2 gap-2">
          <button
            onClick={saveCurrentTicket}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save to Library</span>
          </button>
          <button
            onClick={onNavigateToWorkspace}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#18233A] hover:bg-[#1E2D4A] text-slate-200 text-xs font-semibold border border-[#1E2D4A] transition-colors cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Trim / Split</span>
          </button>
        </div>
      )}
    </aside>
  );
};

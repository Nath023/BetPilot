import React from 'react';
import { Ticket } from '../../../shared/types/index.ts';
import { BookmakerBadge, ConfidenceBadge } from '../common/Badges.tsx';
import { useTicket } from '../../context/TicketContext.tsx';
import { Check, Edit3, AlertTriangle, ArrowRight } from 'lucide-react';

interface ExtractedTicketPreviewProps {
  ticket: Ticket;
  onNavigateToWorkspace?: () => void;
}

export const ExtractedTicketPreview: React.FC<ExtractedTicketPreviewProps> = ({
  ticket,
  onNavigateToWorkspace,
}) => {
  const { setActiveTicket, saveCurrentTicket } = useTicket();

  const uncertainCount = ticket.selections.filter(
    (s) => s.uncertainFields && s.uncertainFields.length > 0
  ).length;

  const handleApply = () => {
    setActiveTicket(ticket);
    saveCurrentTicket();
  };

  return (
    <div className="mt-3 p-4 rounded-xl bg-[#0B1020] border border-[#1E2D4A] space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookmakerBadge bookmaker={ticket.bookmaker} />
          <span className="text-xs font-bold text-white">Extracted Ticket</span>
        </div>
        {ticket.extractionConfidence && (
          <ConfidenceBadge confidence={ticket.extractionConfidence} />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#121A2B] border border-[#1E2D4A] text-center">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Selections</span>
          <span className="text-sm font-bold text-white font-mono">{ticket.selections.length}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Combined Odds</span>
          <span className="text-sm font-bold text-emerald-400 font-mono">{ticket.totalOdds.toFixed(2)}x</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Implied Prob</span>
          <span className="text-sm font-bold text-blue-400 font-mono">
            {(ticket.impliedProbability * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {uncertainCount > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/50 flex items-start gap-2 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>{uncertainCount} selection(s) flagged for review:</strong> Some text or odds were blurry. You can verify and edit each leg directly in the workspace.
          </div>
        </div>
      )}

      {/* Selections preview list */}
      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
        {ticket.selections.map((sel, idx) => (
          <div
            key={sel.id || idx}
            className={`p-2 rounded-md text-xs flex items-center justify-between border ${
              sel.uncertainFields && sel.uncertainFields.length > 0
                ? 'bg-amber-950/20 border-amber-800/40 text-amber-100'
                : 'bg-[#18233A] border-[#1E2D4A] text-slate-200'
            }`}
          >
            <div>
              <div className="font-semibold text-white">
                {sel.homeTeam} vs {sel.awayTeam}
              </div>
              <div className="text-[11px] text-slate-400">
                {sel.selection} • {sel.market}
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-emerald-400">{sel.odds.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleApply}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Load to Active Ticket</span>
        </button>
        {onNavigateToWorkspace && (
          <button
            onClick={() => {
              handleApply();
              onNavigateToWorkspace();
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#18233A] hover:bg-[#1E2D4A] text-slate-300 text-xs font-medium border border-[#1E2D4A] transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit in Workspace</span>
          </button>
        )}
      </div>
    </div>
  );
};

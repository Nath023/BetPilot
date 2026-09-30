import React, { useState } from 'react';
import { useTicket } from '../../context/TicketContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Ticket } from '../../../shared/types/index.ts';
import { BookmakerBadge, DataSourceBadge } from '../common/Badges.tsx';
import { api } from '../../services/api.ts';
import {
  History as HistoryIcon,
  Trash2,
  ExternalLink,
  CheckCircle,
  Copy,
  Layers,
  ArrowRight,
  Sliders,
} from 'lucide-react';

interface HistoryListProps {
  onNavigateToWorkspace: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ onNavigateToWorkspace }) => {
  const { tickets, activeTicket, setActiveTicket, deleteTicket, setPendingAction } = useTicket();
  const { formatMoney } = useAuth();
  const [filter, setFilter] = useState<string>('ALL');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  const filteredTickets = tickets.filter((t) => {
    if (filter === 'ALL') return true;
    return t.status === filter;
  });

  const handleDeletePrompt = (ticket: Ticket) => {
    setPendingAction({
      id: `delete-${ticket.id}`,
      type: 'DELETE_TICKET',
      title: `Delete Ticket "${ticket.title || ticket.id}"?`,
      description: `This action permanently removes this ticket from your library. It cannot be recovered.`,
      requiresConfirmation: true,
      status: 'CONFIRMATION_REQUIRED',
      payload: ticket.id,
    });
  };

  const toggleCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter((item) => item !== id));
    } else {
      if (selectedForCompare.length >= 3) {
        alert('You can compare at most 3 tickets at a time.');
        return;
      }
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const handleRunComparison = async () => {
    if (selectedForCompare.length < 2) {
      alert('Select at least 2 tickets to compare.');
      return;
    }

    const ticketsToCompare = tickets.filter((t) => selectedForCompare.includes(t.id));
    const res = await api.runTool('compare_tickets', { tickets: ticketsToCompare });
    if (res.success) {
      setComparisonResult(res);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#0B1020]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-blue-400" />
            Saved Tickets Library
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Review your saved tickets, compare risk profiles across variations, and reload into active workspace.
          </p>
        </div>

        {selectedForCompare.length >= 2 && (
          <button
            onClick={handleRunComparison}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>Compare Selected ({selectedForCompare.length})</span>
          </button>
        )}
      </div>

      {/* Comparison Drawer / Card if generated */}
      {comparisonResult && (
        <div className="p-5 rounded-2xl bg-[#121A2B] border border-blue-500/50 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Comparative Multi-Ticket Analysis
            </h3>
            <button
              onClick={() => setComparisonResult(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {comparisonResult.comparisons.map((c: any) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-[#0B1020] border border-[#1E2D4A] space-y-2 text-xs"
              >
                <div className="font-bold text-white truncate">{c.title}</div>
                <div className="flex justify-between text-slate-400">
                  <span>Bookmaker:</span>
                  <span className="text-slate-200">{c.bookmaker}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Selections:</span>
                  <span className="text-slate-200 font-mono">{c.selectionCount} legs</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Combined Odds:</span>
                  <span className="text-emerald-400 font-mono font-bold">{c.combinedOdds}x</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Implied Prob:</span>
                  <span className="text-blue-400 font-mono font-bold">{c.impliedProbability}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Avg Leg Odds:</span>
                  <span className="text-slate-300 font-mono">{c.averageOddsPerLeg}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1E2D4A] pb-3 text-xs">
        {['ALL', 'SAVED', 'TRIMMED', 'SPLIT'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-[#18233A]'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.map((ticket) => {
          const isActive = activeTicket?.id === ticket.id;
          const isComparing = selectedForCompare.includes(ticket.id);

          return (
            <div
              key={ticket.id}
              className={`p-4 rounded-xl border transition-all ${
                isActive
                  ? 'bg-[#121A2B] border-blue-500/80 shadow-md'
                  : 'bg-[#121A2B]/70 border-[#1E2D4A] hover:border-slate-600'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isComparing}
                    onChange={() => toggleCompare(ticket.id)}
                    className="w-4 h-4 rounded bg-[#0B1020] border-[#1E2D4A] text-blue-600 cursor-pointer"
                    title="Select to compare"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <BookmakerBadge bookmaker={ticket.bookmaker} />
                      <h3 className="text-sm font-bold text-white">
                        {ticket.title || `${ticket.bookmaker} Ticket`}
                      </h3>
                      {isActive && (
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                          Active in Workspace
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {ticket.selections.length} legs • Odds: <strong className="text-emerald-400 font-mono">{ticket.totalOdds.toFixed(2)}x</strong> • Return: <strong className="text-white font-mono">{formatMoney(ticket.potentialReturn)}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isActive && (
                    <button
                      onClick={() => {
                        setActiveTicket(ticket);
                        onNavigateToWorkspace();
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#18233A] hover:bg-[#1E2D4A] text-slate-200 text-xs font-semibold border border-[#1E2D4A] cursor-pointer"
                    >
                      <span>Load to Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDeletePrompt(ticket)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-[#18233A] rounded-lg transition-colors cursor-pointer"
                    title="Delete ticket"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTickets.length === 0 && (
          <div className="p-8 text-center text-slate-500 rounded-xl bg-[#121A2B] border border-[#1E2D4A]">
            No tickets match this filter. Upload a screenshot or save your current active ticket.
          </div>
        )}
      </div>
    </div>
  );
};

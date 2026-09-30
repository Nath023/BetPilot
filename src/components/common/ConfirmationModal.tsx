import React from 'react';
import { ProposedAction } from '../../../shared/types/index.ts';
import { AlertTriangle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

interface ConfirmationModalProps {
  action: ProposedAction | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  action,
  onConfirm,
  onCancel,
}) => {
  if (!action) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#121A2B] border border-[#1E2D4A] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 bg-[#18233A] border-b border-[#1E2D4A]">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{action.title}</h3>
            <p className="text-xs text-slate-400">Confirmation required before updating workspace ticket</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-slate-300 leading-relaxed">{action.description}</p>

          {/* Comparison summary card */}
          {(action.beforeSummary || action.afterSummary) && (
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-[#0B1020] border border-[#1E2D4A]">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Current
                </span>
                {action.beforeSummary && (
                  <div className="space-y-1 text-xs text-slate-300 font-mono">
                    {Object.entries(action.beforeSummary).map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span className="capitalize text-slate-500">{key.replace(/Count|Odds/, '')}:</span>
                        <span className="text-white font-medium">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                  Proposed
                </span>
                {action.afterSummary && (
                  <div className="space-y-1 text-xs text-slate-300 font-mono">
                    {Object.entries(action.afterSummary)
                      .filter(([key]) => key !== 'removed')
                      .map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize text-slate-500">{key.replace(/Count|Odds/, '')}:</span>
                          <span className="text-emerald-400 font-semibold">{String(val)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* List of items being removed if trimming */}
          {action.afterSummary?.removed && Array.isArray(action.afterSummary.removed) && (
            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40">
              <span className="text-xs font-semibold text-rose-400 block mb-1.5">
                Selections marked for removal ({action.afterSummary.removed.length}):
              </span>
              <ul className="space-y-1 text-xs text-slate-300">
                {action.afterSummary.removed.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-1.5 text-rose-300/80">
                    <span className="text-rose-500">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-[11px] text-slate-400 italic">
            BetPilot AI principle: Your original ticket will never be silently altered or discarded without explicit approval.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-4 bg-[#0B1020] border-t border-[#1E2D4A]">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent"
          >
            Cancel (Keep Original)
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            Confirm & Apply Change
          </button>
        </div>
      </div>
    </div>
  );
};

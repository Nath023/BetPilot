import React from 'react';
import { CandidateSelection } from '../../../shared/types/index.ts';
import { ShieldCheck, TrendingUp, AlertTriangle, Sparkles, Plus, Check } from 'lucide-react';

interface PredictionCardProps {
  candidate: CandidateSelection;
  onSelectCandidate?: (candidate: CandidateSelection) => void;
  isSelected?: boolean;
  onResearchFixture?: (fixtureName: string) => void;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  candidate,
  onSelectCandidate,
  isSelected,
  onResearchFixture,
}) => {
  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        isSelected
          ? 'bg-[#121A2B] border-blue-500/80 shadow-md ring-1 ring-blue-500/40'
          : 'bg-[#121A2B]/70 border-[#1E2D4A] hover:border-slate-600'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#1E2D4A]/70 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-white">
              {candidate.homeTeam} <span className="text-slate-500 font-normal">vs</span> {candidate.awayTeam}
            </h3>
            <span className="text-[10px] text-slate-400 bg-[#0B1020] px-2 py-0.5 rounded border border-[#1E2D4A]">
              {candidate.competition}
            </span>
          </div>
          <div className="text-xs text-blue-400 font-semibold mt-1">
            {candidate.selection} • <span className="text-slate-400 font-normal">{candidate.market}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800">
            {candidate.bookmakerOdds.toFixed(2)}x
          </span>

          {onSelectCandidate && (
            <button
              onClick={() => onSelectCandidate(candidate)}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[#18233A] text-slate-300 hover:text-white hover:bg-[#1E2D4A] border border-[#1E2D4A]'
              }`}
              title={isSelected ? 'Selected in builder' : 'Add to slip'}
            >
              {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 text-xs border-b border-[#1E2D4A]/60">
        <div>
          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Implied Prob</span>
          <span className="font-mono text-slate-200">{(candidate.impliedProbability * 100).toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Model Estimate</span>
          <span className="font-mono font-bold text-blue-400">
            {(candidate.modelEstimatedProbability * 100).toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Estimated Edge</span>
          <span
            className={`font-mono font-bold ${
              candidate.edgePercentage >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {candidate.edgePercentage >= 0 ? '+' : ''}
            {candidate.edgePercentage.toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Data Quality</span>
          <span
            className={`font-semibold text-[11px] ${
              candidate.dataQuality === 'HIGH' ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {candidate.dataQuality}
          </span>
        </div>
      </div>

      {/* Why Selected & Transparent Limitations */}
      <div className="pt-3 space-y-2 text-xs">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Statistical Justification:
          </span>
          <ul className="space-y-1 text-slate-300">
            {candidate.whySelected.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-400">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {candidate.limitations && candidate.limitations.length > 0 && (
          <div className="p-2 rounded-lg bg-[#0B1020] border border-[#1E2D4A] text-[11px] text-slate-400 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>Limitations: {candidate.limitations.join(' • ')}</span>
          </div>
        )}
      </div>

      {onResearchFixture && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={() => onResearchFixture(`${candidate.homeTeam} vs ${candidate.awayTeam}`)}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
          >
            Inspect Detailed Fixture Head-to-Head →
          </button>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { VerificationStatus } from '../../../shared/types/index.ts';
import { ShieldCheck, User, Calculator, Sparkles, AlertCircle, Database } from 'lucide-react';

export const DataSourceBadge: React.FC<{ status: VerificationStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'VERIFIED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 ${className}`}
        >
          <ShieldCheck className="w-3 h-3" />
          Verified Data
        </span>
      );
    case 'USER_PROVIDED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-950/70 text-blue-400 border border-blue-800/60 ${className}`}
        >
          <User className="w-3 h-3" />
          User Provided
        </span>
      );
    case 'CALCULATED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-950/70 text-purple-400 border border-purple-800/60 ${className}`}
        >
          <Calculator className="w-3 h-3" />
          Calculated Math
        </span>
      );
    case 'AI_ESTIMATE':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-950/70 text-amber-400 border border-amber-800/60 ${className}`}
        >
          <Sparkles className="w-3 h-3" />
          Model Estimate (Uncertain)
        </span>
      );
    case 'UNAVAILABLE':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-800/80 text-slate-400 border border-slate-700 ${className}`}
        >
          <AlertCircle className="w-3 h-3" />
          Unavailable
        </span>
      );
  }
};

export const ConfidenceBadge: React.FC<{ confidence: number }> = ({ confidence }) => {
  const percent = Math.round((confidence || 0) * 100);
  let color = 'bg-emerald-950 text-emerald-400 border-emerald-800';
  if (percent < 70) {
    color = 'bg-rose-950 text-rose-400 border-rose-800';
  } else if (percent < 85) {
    color = 'bg-amber-950 text-amber-400 border-amber-800';
  }

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono border ${color}`}>
      {percent}% conf
    </span>
  );
};

export const DemoModeBadge: React.FC = () => {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
      <Database className="w-3 h-3" />
      DEMO MODE
    </span>
  );
};

export const BookmakerBadge: React.FC<{ bookmaker: string }> = ({ bookmaker }) => {
  const name = bookmaker || 'Unknown';
  let badgeClass = 'bg-slate-800 text-slate-200 border-slate-700';

  if (name.toLowerCase().includes('sporty')) {
    badgeClass = 'bg-red-950/80 text-red-300 border-red-800/80';
  } else if (name.toLowerCase().includes('bet9ja')) {
    badgeClass = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
  } else if (name.toLowerCase().includes('1xbet')) {
    badgeClass = 'bg-blue-950/80 text-blue-300 border-blue-800/80';
  } else if (name.toLowerCase().includes('betking')) {
    badgeClass = 'bg-amber-950/80 text-amber-300 border-amber-800/80';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${badgeClass}`}>
      {name}
    </span>
  );
};

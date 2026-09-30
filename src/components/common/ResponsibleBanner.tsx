import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Shield, Clock, AlertTriangle, ExternalLink, X } from 'lucide-react';

export const ResponsibleBanner: React.FC = () => {
  const { preferences, sessionMinutes } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!preferences.responsibleGamblingMode || dismissed) return null;

  const isSessionLong = sessionMinutes >= (preferences.sessionTimeLimitMinutes || 60);

  return (
    <div
      className={`px-4 py-2 border-b text-xs flex flex-wrap items-center justify-between gap-2 transition-colors ${
        isSessionLong
          ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
          : 'bg-[#0f172a] border-[#1e293b] text-slate-400'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 font-semibold text-emerald-400">
          <Shield className="w-3.5 h-3.5" />
          Responsible Gambling Safeguard
        </span>
        <span className="hidden sm:inline text-slate-600">•</span>
        <span className="flex items-center gap-1 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          Session Time: <strong className="text-white">{sessionMinutes} mins</strong>
        </span>
        {isSessionLong && (
          <span className="inline-flex items-center gap-1 font-medium text-amber-300 bg-amber-900/30 px-2 py-0.5 rounded">
            <AlertTriangle className="w-3 h-3" /> Time limit reached. Consider taking a breather!
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <a
          href="https://www.gamcare.org.uk/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
        >
          GamCare Support <ExternalLink className="w-2.5 h-2.5" />
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-500 hover:text-slate-300 p-0.5 rounded"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

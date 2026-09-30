import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { DailyRolloverChallenge } from '../../../shared/types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { History, Calendar, CheckCircle2, XCircle, AlertCircle, TrendingUp } from 'lucide-react';

export const RolloverHistoryView: React.FC = () => {
  const { formatMoney } = useAuth();
  const [challenge, setChallenge] = useState<DailyRolloverChallenge | null>(null);

  useEffect(() => {
    api.getDailyRollover().then((res) => {
      if (res.success && res.challenge) setChallenge(res.challenge);
    });
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#0B1020]">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" />
          Daily Rollover History & Progression Log
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Auditable archive of all daily rollover selections, settled stakes, returns, and progression metrics.
        </p>
      </div>

      {challenge ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#121A2B] border border-[#1E2D4A] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-400">Challenge:</span> <strong className="text-white">{challenge.title}</strong>
            </div>
            <div className="flex items-center gap-4">
              <span>Start: <strong className="text-slate-200">{formatMoney(challenge.startingBankroll)}</strong></span>
              <span>Current: <strong className="text-emerald-400 font-mono">{formatMoney(challenge.currentBankroll)}</strong></span>
              <span>Target: <strong className="text-purple-400 font-mono">{formatMoney(challenge.targetAmount)}</strong></span>
            </div>
          </div>

          <div className="space-y-2">
            {challenge.days.map((day) => (
              <div
                key={day.dayNumber}
                className="p-4 rounded-xl bg-[#121A2B] border border-[#1E2D4A] flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#0B1020] border border-[#1E2D4A] font-mono font-bold text-white flex items-center justify-center text-xs">
                    D{day.dayNumber}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Day {day.dayNumber} ({day.date})</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          day.status === 'WON'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : day.status === 'LOST'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : day.status === 'READY'
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {day.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Target Odds: {day.targetOdds}
                      {day.selectedSlip && ` • Slip: ${day.selectedSlip.title} (${day.selectedSlip.combinedOdds.toFixed(2)}x)`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {day.stake ? (
                    <div>
                      <span className="text-slate-400">Stake: {formatMoney(day.stake)}</span>
                      {day.actualReturn !== undefined && (
                        <div
                          className={`font-mono font-bold ${
                            day.actualReturn > day.stake ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          Return: {formatMoney(day.actualReturn)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">Not yet wagered</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500 rounded-xl bg-[#121A2B] border border-[#1E2D4A]">
          Loading rollover challenge history...
        </div>
      )}
    </div>
  );
};

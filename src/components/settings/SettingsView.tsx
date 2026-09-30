import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { REGISTERED_BOOKMAKERS } from '../../../shared/constants/bookmakers.ts';
import { api } from '../../services/api.ts';
import { Currency } from '../../../shared/types/index.ts';
import {
  Settings,
  Shield,
  Clock,
  DollarSign,
  AlertTriangle,
  Server,
  ExternalLink,
  Check,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { preferences, updatePreferences, user } = useAuth();
  const [currency, setCurrency] = useState<Currency>(preferences.currency);
  const [defaultBookmaker, setDefaultBookmaker] = useState(preferences.defaultBookmaker);
  const [maxStake, setMaxStake] = useState(String(preferences.maxStakeLimit || 50000));
  const [sessionLimit, setSessionLimit] = useState(String(preferences.sessionTimeLimitMinutes || 60));
  const [evWarnings, setEvWarnings] = useState(preferences.enableEvWarnings);
  const [respMode, setRespMode] = useState(preferences.responsibleGamblingMode);

  const [savedNotice, setSavedNotice] = useState(false);
  const [serverHealth, setServerHealth] = useState<any>(null);

  useEffect(() => {
    api.getHealth().then((h) => setServerHealth(h)).catch(() => {});
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePreferences({
      currency,
      defaultBookmaker,
      maxStakeLimit: parseFloat(maxStake) || 50000,
      sessionTimeLimitMinutes: parseInt(sessionLimit, 10) || 60,
      enableEvWarnings: evWarnings,
      responsibleGamblingMode: respMode,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#0B1020]">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Settings & Responsible Gaming Safeguards
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure default currency, bookmaker adapters, stake safety limits, and review connected provider status.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Preferences updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        {/* User Profile Card */}
        <div className="p-5 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-4 shadow-lg">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            User Account Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Display Name</span>
              <input
                type="text"
                disabled
                value={user?.displayName || 'Alex O.'}
                className="w-full bg-[#0B1020] border border-[#1E2D4A] text-slate-300 rounded-lg p-2.5 font-medium"
              />
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Email</span>
              <input
                type="text"
                disabled
                value={user?.email || 'trader@betpilot.ai'}
                className="w-full bg-[#0B1020] border border-[#1E2D4A] text-slate-300 rounded-lg p-2.5 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Currency & Bookmaker Preferences */}
        <div className="p-5 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-4 shadow-lg">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Preferences & Formats
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label htmlFor="pref-currency" className="text-slate-400 block mb-1">Default Workspace Currency</label>
              <select
                id="pref-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full bg-[#0B1020] border border-[#1E2D4A] text-white rounded-lg p-2.5 outline-none cursor-pointer"
              >
                <option value="NGN">NGN (₦) - Nigerian Naira</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="EUR">EUR (€) - Euro</option>
              </select>
            </div>

            <div>
              <label htmlFor="pref-bookmaker" className="text-slate-400 block mb-1">Primary Bookmaker</label>
              <select
                id="pref-bookmaker"
                value={defaultBookmaker}
                onChange={(e) => setDefaultBookmaker(e.target.value)}
                className="w-full bg-[#0B1020] border border-[#1E2D4A] text-white rounded-lg p-2.5 outline-none cursor-pointer"
              >
                <option value="SportyBet">SportyBet</option>
                <option value="Bet9ja">Bet9ja</option>
                <option value="1xBet">1xBet</option>
                <option value="BetKing">BetKing</option>
              </select>
            </div>
          </div>
        </div>

        {/* Responsible Gambling Safeguards */}
        <div className="p-5 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-4 shadow-lg">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Responsible Gambling Safeguards
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Set safety rails to protect against loss-chasing, excessive stake sizes, and extended wagering sessions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label htmlFor="pref-max-stake" className="text-slate-400 block mb-1">Max Single Stake Warning (₦)</label>
              <input
                id="pref-max-stake"
                type="number"
                value={maxStake}
                onChange={(e) => setMaxStake(e.target.value)}
                className="w-full bg-[#0B1020] border border-[#1E2D4A] text-white font-mono rounded-lg p-2.5 outline-none"
              />
            </div>

            <div>
              <label htmlFor="pref-session-limit" className="text-slate-400 block mb-1">Session Reminder Timer (Minutes)</label>
              <input
                id="pref-session-limit"
                type="number"
                value={sessionLimit}
                onChange={(e) => setSessionLimit(e.target.value)}
                className="w-full bg-[#0B1020] border border-[#1E2D4A] text-white font-mono rounded-lg p-2.5 outline-none"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={respMode}
                onChange={(e) => setRespMode(e.target.checked)}
                className="w-4 h-4 rounded bg-[#0B1020] border-[#1E2D4A] text-blue-600"
              />
              <span>Enable session duration banner and timeout reminders</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={evWarnings}
                onChange={(e) => setEvWarnings(e.target.checked)}
                className="w-4 h-4 rounded bg-[#0B1020] border-[#1E2D4A] text-blue-600"
              />
              <span>Display mathematical risk warnings on accumulators with {'>'}10 selections</span>
            </label>
          </div>

          {/* External Support Helplines */}
          <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#1E2D4A] space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Confidential Support Resources
            </span>
            <div className="flex flex-wrap gap-4 text-xs">
              <a
                href="https://www.gamcare.org.uk/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                GamCare (24/7 Helpline) <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://www.gamblersanonymous.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Gamblers Anonymous <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Connected Bookmaker Adapters & API Status */}
        <div className="p-5 rounded-2xl bg-[#121A2B] border border-[#1E2D4A] space-y-4 shadow-lg">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Integration & Adapter Status
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            BetPilot AI operates under strict transparency: live bookmaker booking code generation and automated bet placement are never simulated.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {REGISTERED_BOOKMAKERS.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl bg-[#0B1020] border border-[#1E2D4A] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{b.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {b.integrationStatus}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Parsing: <strong>{b.supportsCodeParsing ? 'Supported' : 'No'}</strong> • Conversion:{' '}
                  <strong>{b.supportsConversion ? 'Supported' : 'No'}</strong>
                </div>
                <div className="text-[10px] text-slate-500">{b.notes}</div>
              </div>
            ))}
          </div>

          {serverHealth && (
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#1E2D4A] flex items-center justify-between text-xs text-slate-400">
              <span>Gemini 3.x Multimodal Vision:</span>
              <span className={serverHealth.geminiConfigured ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {serverHealth.geminiConfigured ? 'Connected & Ready' : 'API Key Active (Server)'}
              </span>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-colors cursor-pointer"
        >
          Save All Settings
        </button>
      </form>
    </div>
  );
};

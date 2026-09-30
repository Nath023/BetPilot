import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTicket } from '../../context/TicketContext.tsx';
import { DemoModeBadge } from '../common/Badges.tsx';
import { Compass, Ticket as TicketIcon, Sliders, Shield, Cloud, CloudOff } from 'lucide-react';
import { Currency } from '../../../shared/types/index.ts';
import { AuthModal } from '../auth/AuthModal.tsx';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  toggleRightPanel: () => void;
  isRightPanelOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  toggleRightPanel,
  isRightPanelOpen,
}) => {
  const { preferences, updatePreferences, formatMoney, cloudSyncStatus, firebaseUser } = useAuth();
  const { activeTicket } = useTicket();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleCurrencyChange = (c: Currency) => {
    updatePreferences({ currency: c });
  };

  return (
    <header className="h-14 border-b border-[#1E2D4A] bg-[#121A2B]/90 backdrop-blur-md px-4 flex items-center justify-between z-30 sticky top-0">
      {/* Brand logo & title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('chat')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white">BetPilot</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                AI
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block leading-none">Sports Copilot</span>
          </div>
        </div>

        <div className="hidden md:block">
          <DemoModeBadge />
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Currency Switcher */}
        <div className="flex items-center bg-[#0B1020] rounded-lg p-0.5 border border-[#1E2D4A] text-xs">
          {(['NGN', 'USD', 'GBP', 'EUR'] as Currency[]).map((cur) => (
            <button
              key={cur}
              onClick={() => handleCurrencyChange(cur)}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                preferences.currency === cur
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cur === 'NGN' ? '₦' : cur === 'USD' ? '$' : cur === 'GBP' ? '£' : '€'}
            </button>
          ))}
        </div>

        {/* Cloud Sync / Account Button */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            cloudSyncStatus === 'connected'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
              : 'bg-[#0B1020] text-slate-300 border-[#1E2D4A] hover:bg-[#18233A]'
          }`}
          title={firebaseUser ? `Signed in as ${firebaseUser.email}` : 'Cloud Sync Settings'}
        >
          {cloudSyncStatus === 'connected' ? (
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <CloudOff className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="hidden md:inline">
            {firebaseUser ? (firebaseUser.email?.split('@')[0] || 'Cloud') : 'Cloud Sync'}
          </span>
        </button>

        {/* Active Ticket Toggle Button (shows odds badge) */}
        <button
          onClick={toggleRightPanel}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            isRightPanelOpen
              ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-xs'
              : 'bg-[#18233A] text-slate-200 border-[#1E2D4A] hover:bg-[#1E2D4A]'
          }`}
          title="Toggle Ticket Inspector"
        >
          <TicketIcon className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:inline">Ticket</span>
          {activeTicket ? (
            <span className="px-1.5 py-0.2 rounded bg-[#0B1020] text-emerald-400 font-mono text-[11px] font-bold border border-[#1E2D4A]">
              {activeTicket.totalOdds.toFixed(2)}x
            </span>
          ) : (
            <span className="text-slate-500 text-[11px]">Empty</span>
          )}
        </button>
      </div>

      {/* Cloud Account & Sync Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  );
};

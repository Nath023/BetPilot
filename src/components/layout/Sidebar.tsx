import React from 'react';
import {
  MessageSquare,
  Ticket,
  Percent,
  Search,
  History,
  Settings,
  PlusCircle,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { useTicket } from '../../context/TicketContext.tsx';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { loadDemoTicket } = useTicket();

  const navItems = [
    { id: 'chat', label: 'AI Copilot', icon: MessageSquare, badge: 'Live' },
    { id: 'tickets', label: 'Ticket Workspace', icon: Ticket },
    { id: 'calibration', label: 'Model Accuracy & ROI', icon: BarChart3, badge: 'Stats' },
    { id: 'predictions', label: 'Predictions Engine', icon: Sparkles, badge: 'New' },
    { id: 'daily_rollover', label: "Today's Rollover", icon: Percent, badge: '4-5 Odds' },
    { id: 'rollover_history', label: 'Rollover History', icon: History },
    { id: 'history', label: 'Saved Library', icon: Ticket },
    { id: 'research', label: 'Fixture Research', icon: Search },
    { id: 'settings', label: 'Settings & Limits', icon: Settings },
  ];

  return (
    <aside className="w-60 bg-[#121A2B] border-r border-[#1E2D4A] flex flex-col justify-between h-[calc(100vh-3.5rem)] select-none">
      {/* Navigation Links */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Workspace Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-300 hover:text-white hover:bg-[#18233A]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    isActive ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Actions & Demo Presets */}
      <div className="p-3 border-t border-[#1E2D4A] space-y-2 bg-[#0B1020]/40">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-2">
          Demo Benchmark Data
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => loadDemoTicket(0)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-[#18233A] hover:bg-[#1E2D4A] text-slate-300 hover:text-white text-[11px] font-medium border border-[#1E2D4A] transition-colors cursor-pointer"
            title="Load 8-selection accumulator"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Ticket 1 (8L)</span>
          </button>
          <button
            onClick={() => loadDemoTicket(1)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-[#18233A] hover:bg-[#1E2D4A] text-slate-300 hover:text-white text-[11px] font-medium border border-[#1E2D4A] transition-colors cursor-pointer"
            title="Load 5-selection parlay"
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Ticket 2 (5L)</span>
          </button>
        </div>

        <div className="pt-2 text-[10px] text-slate-400 px-2 leading-relaxed">
          BetPilot AI enforces deterministic calculations and source-labeled sports metrics.
        </div>
      </div>
    </aside>
  );
};

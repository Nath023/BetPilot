import React from 'react';
import { MessageSquare, Ticket, Percent, Sparkles, Settings, BarChart3 } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'tickets', label: 'Tickets', icon: Ticket },
    { id: 'calibration', label: 'Metrics', icon: BarChart3 },
    { id: 'predictions', label: 'Picks', icon: Sparkles },
    { id: 'daily_rollover', label: 'Rollover', icon: Percent },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#121A2B] border-t border-[#1E2D4A] flex items-center justify-around px-2 z-40">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center w-full py-1 text-[10px] font-medium transition-colors cursor-pointer ${
              isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

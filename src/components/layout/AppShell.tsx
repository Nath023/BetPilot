import React, { useState } from 'react';
import { Header } from './Header.tsx';
import { Sidebar } from './Sidebar.tsx';
import { MobileNav } from './MobileNav.tsx';
import { ActiveTicketPanel } from './ActiveTicketPanel.tsx';
import { ResponsibleBanner } from '../common/ResponsibleBanner.tsx';
import { ChatWindow } from '../chat/ChatWindow.tsx';
import { TicketEditor } from '../tickets/TicketEditor.tsx';
import { RolloverDashboard } from '../rollover/RolloverDashboard.tsx';
import { DailyRolloverView } from '../rollover/DailyRolloverView.tsx';
import { RolloverHistoryView } from '../rollover/RolloverHistoryView.tsx';
import { PredictionsView } from '../predictions/PredictionsView.tsx';
import { ResearchPanel } from '../research/ResearchPanel.tsx';
import { HistoryList } from '../history/HistoryList.tsx';
import { SettingsView } from '../settings/SettingsView.tsx';
import { CalibrationDashboard } from '../calibration/CalibrationDashboard.tsx';

export const AppShell: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-[#0B1020] text-[#F5F7FA] flex flex-col font-sans select-none">
      {/* Responsible Gaming Banner */}
      <ResponsibleBanner />

      {/* Main Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        toggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
        isRightPanelOpen={isRightPanelOpen}
      />

      {/* App Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Desktop) */}
        <div className="hidden md:block shrink-0">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Center Main View Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-14 md:pb-0">
          {activeTab === 'chat' && (
            <ChatWindow onNavigateToWorkspace={() => setActiveTab('tickets')} />
          )}
          {activeTab === 'tickets' && <TicketEditor />}
          {activeTab === 'calibration' && <CalibrationDashboard />}
          {activeTab === 'predictions' && (
            <PredictionsView
              onNavigateToRollover={() => setActiveTab('daily_rollover')}
              onNavigateToResearch={() => setActiveTab('research')}
            />
          )}
          {(activeTab === 'daily_rollover' || activeTab === 'rollover') && <DailyRolloverView />}
          {activeTab === 'rollover_history' && <RolloverHistoryView />}
          {activeTab === 'research' && <ResearchPanel />}
          {activeTab === 'history' && (
            <HistoryList onNavigateToWorkspace={() => setActiveTab('tickets')} />
          )}
          {activeTab === 'settings' && <SettingsView />}
        </main>

        {/* Right Active Ticket Inspector (Desktop) */}
        <div className="hidden lg:block shrink-0">
          <ActiveTicketPanel
            isOpen={isRightPanelOpen}
            onClose={() => setIsRightPanelOpen(false)}
            onNavigateToWorkspace={() => setActiveTab('tickets')}
          />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

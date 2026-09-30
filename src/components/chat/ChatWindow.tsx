import React, { useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext.tsx';
import { useTicket } from '../../context/TicketContext.tsx';
import { ChatMessageItem } from './ChatMessageItem.tsx';
import { ChatComposer } from './ChatComposer.tsx';
import { ToolStatusIndicator } from './ToolStatusIndicator.tsx';
import { ConfirmationModal } from '../common/ConfirmationModal.tsx';
import { Sparkles, Trash2, ShieldCheck, Ticket as TicketIcon } from 'lucide-react';

interface ChatWindowProps {
  onNavigateToWorkspace: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onNavigateToWorkspace }) => {
  const { messages, isLoading, toolStatus, sendMessage, clearMessages } = useChat();
  const { pendingAction, confirmPendingAction, cancelPendingAction, activeTicket, loadDemoTicket } = useTicket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolStatus]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-[#0B1020] relative overflow-hidden">
      {/* Workspace Subheader */}
      <div className="h-10 px-4 border-b border-[#1E2D4A] bg-[#121A2B]/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Active Context:</span>
          {activeTicket ? (
            <span className="text-white font-medium">
              {activeTicket.bookmaker} ({activeTicket.selections.length} legs @ {activeTicket.totalOdds.toFixed(2)}x)
            </span>
          ) : (
            <span className="text-slate-500 italic">No ticket loaded</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!activeTicket && (
            <button
              onClick={() => loadDemoTicket(0)}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
            >
              + Load Benchmark Ticket
            </button>
          )}
          <button
            onClick={clearMessages}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer p-1 rounded hover:bg-[#18233A]"
            title="Reset conversation"
          >
            <Trash2 className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            onSelectPrompt={(p) => sendMessage(p)}
            onNavigateToWorkspace={onNavigateToWorkspace}
          />
        ))}

        {/* Live tool status / progress spinner */}
        {isLoading && <ToolStatusIndicator status={toolStatus} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Composer */}
      <ChatComposer
        onSendMessage={sendMessage}
        isLoading={isLoading}
        onSelectPrompt={(p) => sendMessage(p)}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        action={pendingAction}
        onConfirm={confirmPendingAction}
        onCancel={cancelPendingAction}
      />
    </div>
  );
};

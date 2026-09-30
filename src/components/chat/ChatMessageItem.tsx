import React from 'react';
import { ChatMessage } from '../../../shared/types/index.ts';
import { DataSourceBadge } from '../common/Badges.tsx';
import { ExtractedTicketPreview } from './ExtractedTicketPreview.tsx';
import { useTicket } from '../../context/TicketContext.tsx';
import { Compass, User, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
  onSelectPrompt?: (prompt: string) => void;
  onNavigateToWorkspace?: () => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onSelectPrompt,
  onNavigateToWorkspace,
}) => {
  const isAssistant = message.sender === 'assistant';
  const { setPendingAction, confirmPendingAction, cancelPendingAction } = useTicket();

  // Helper to format text with bold, bullet points, headers
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-white text-sm mt-2 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('• ') || line.startsWith('- ')) {
        const content = line.substring(2);
        return (
          <div key={idx} className="flex items-start gap-2 ml-1 text-slate-300 my-0.5 text-xs">
            <span className="text-blue-400 font-bold leading-none mt-1">•</span>
            <span>{renderInlineFormatting(content)}</span>
          </div>
        );
      }
      return (
        <p key={idx} className="my-1 text-xs text-slate-300 leading-relaxed">
          {renderInlineFormatting(line)}
        </p>
      );
    });
  };

  const renderInlineFormatting = (str: string) => {
    // Basic bold **text** parsing
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={i} className="text-slate-400 italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl transition-all ${
        isAssistant
          ? 'bg-[#121A2B]/80 border border-[#1E2D4A]/80 shadow-xs'
          : 'bg-[#18233A]/60 border border-transparent'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isAssistant
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            : 'bg-slate-700 text-slate-300'
        }`}
      >
        {isAssistant ? <Compass className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div className="flex-1 space-y-2 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">
              {isAssistant ? 'BetPilot Copilot' : 'You'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {message.dataStatus && (
            <DataSourceBadge status={message.dataStatus} />
          )}
        </div>

        {/* Attachment Image Preview */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 my-2">
            {message.attachments.map((att) => (
              <div
                key={att.id}
                className="relative rounded-lg overflow-hidden border border-[#1E2D4A] max-w-xs group bg-[#0B1020]"
              >
                <img
                  src={att.url}
                  alt={att.filename}
                  className="max-h-56 object-contain rounded-lg"
                />
                <div className="text-[10px] text-slate-400 p-1 bg-[#121A2B] truncate font-mono">
                  {att.filename}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Body Text */}
        <div className="text-xs">{renderFormattedText(message.content)}</div>

        {/* Extracted Ticket Card if present */}
        {message.extractedTicket && (
          <ExtractedTicketPreview
            ticket={message.extractedTicket}
            onNavigateToWorkspace={onNavigateToWorkspace}
          />
        )}

        {/* Proposed Action Card with inline confirmation */}
        {message.proposedAction && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#0B1020] border border-blue-900/50 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
              <AlertCircle className="w-4 h-4 text-blue-400" />
              <span>{message.proposedAction.title}</span>
            </div>
            <p className="text-xs text-slate-300">{message.proposedAction.description}</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setPendingAction(message.proposedAction || null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Review & Confirm Action
              </button>
              <button
                onClick={cancelPendingAction}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-medium hover:bg-slate-800 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Warnings list if any */}
        {message.warnings && message.warnings.length > 0 && (
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1 text-[11px] text-slate-400">
            {message.warnings.map((w, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="text-amber-400">•</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Suggested Prompts pills */}
        {message.suggestedPrompts && message.suggestedPrompts.length > 0 && onSelectPrompt && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {message.suggestedPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onSelectPrompt(prompt)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#18233A] hover:bg-[#1E2D4A] text-slate-300 hover:text-blue-300 text-[11px] font-medium border border-[#1E2D4A] transition-colors cursor-pointer"
              >
                <span>{prompt}</span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

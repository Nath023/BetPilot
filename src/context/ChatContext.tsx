import React, { createContext, useContext, useState } from 'react';
import { ChatMessage, Ticket, ProposedAction } from '../../shared/types/index.ts';
import { api } from '../services/api.ts';
import { useTicket } from './TicketContext.tsx';

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  toolStatus: string | null;
  sendMessage: (content: string, imageBase64?: string, mimeType?: string, filename?: string) => Promise<void>;
  clearMessages: () => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'assistant',
    content: `👋 **Welcome to BetPilot AI**\n\nI am your sports research and ticket-management copilot. Here is how I can assist:\n\n• **Ticket Extraction:** Upload or paste any betting ticket screenshot (SportyBet, Bet9ja, 1xBet, BetKing).\n• **Odds & Payouts:** Calculate true combined decimal odds, payout returns, and implied probabilities.\n• **Trim & Split:** Trim risky games or split parlays into doubles/trebles with full confirmation control.\n• **Rollover Tracker:** Track bonus wagering progress with qualification rule verification.\n• **Fixture Research:** Review verified Head-to-Head stats, recent form, and home/away trends.\n\n*BetPilot AI strictly distinguishes verified data from estimates and never fabricates live odds or outcomes.*`,
    timestamp: new Date().toISOString(),
    dataStatus: 'VERIFIED',
    suggestedPrompts: [
      'Analyze current ticket',
      'Trim to 5 selections',
      'Research Arsenal vs Chelsea',
      'Check bonus rollover',
    ],
  },
];

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const { activeTicket, setActiveTicket, setPendingAction } = useTicket();

  const sendMessage = async (
    content: string,
    imageBase64?: string,
    mimeType?: string,
    filename?: string
  ) => {
    const userMsgId = `msg-user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      content: content || (imageBase64 ? 'Uploaded betting ticket screenshot for analysis.' : ''),
      timestamp: new Date().toISOString(),
      attachments: imageBase64
        ? [
            {
              id: `att-${Date.now()}`,
              type: 'image',
              url: imageBase64,
              filename: filename || 'ticket_screenshot.png',
            },
          ]
        : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    if (imageBase64) {
      setToolStatus('Analyzing screenshot with multimodal vision...');
    } else if (content.toLowerCase().includes('trim')) {
      setToolStatus('Evaluating selection risks & trimming options...');
    } else if (content.toLowerCase().includes('split')) {
      setToolStatus('Calculating ticket combinations...');
    } else if (content.toLowerCase().includes('research')) {
      setToolStatus('Querying verified match database...');
    } else {
      setToolStatus('Processing request...');
    }

    try {
      const response = await api.sendChatMessage({
        message: content,
        history: messages.slice(-6).map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        currentTicket: activeTicket || undefined,
        imageBase64,
        mimeType,
      });

      // Update active ticket if newly extracted
      if (response.extractedTicket) {
        setActiveTicket(response.extractedTicket);
      }

      // If proposed action returned, set pending confirmation
      if (response.proposedAction) {
        setPendingAction(response.proposedAction);
      }

      const assistantMsg: ChatMessage = {
        id: `msg-asst-${Date.now()}`,
        sender: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        extractedTicket: response.extractedTicket,
        proposedAction: response.proposedAction,
        toolResults: response.toolResults,
        dataStatus: response.dataStatus,
        warnings: response.warnings,
        suggestedPrompts: response.suggestedPrompts,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'assistant',
        content: `⚠️ **Processing Error:** ${err.message || 'An unexpected error occurred while processing your request.'}\n\nPlease try again or verify that your input matches standard ticket formatting.`,
        timestamp: new Date().toISOString(),
        dataStatus: 'UNAVAILABLE',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setToolStatus(null);
    }
  };

  const clearMessages = () => {
    setMessages(INITIAL_MESSAGES);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        toolStatus,
        sendMessage,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};

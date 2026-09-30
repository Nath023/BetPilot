import React, { createContext, useContext, useState, useEffect } from 'react';
import { Ticket, Selection, ProposedAction } from '../../shared/types/index.ts';
import { storage } from '../services/storage.ts';
import { calculateCombinedOdds, calculatePayout, calculateImpliedProbability } from '../../shared/utils/calculations.ts';
import { DEMO_TICKETS } from '../../shared/constants/demoData.ts';

interface TicketContextType {
  tickets: Ticket[];
  activeTicket: Ticket | null;
  setActiveTicket: (ticket: Ticket | null) => void;
  setActiveTicketById: (ticketId: string) => void;
  updateActiveTicket: (updates: Partial<Ticket>) => void;
  updateSelection: (selectionId: string, updates: Partial<Selection>) => void;
  removeSelection: (selectionId: string) => void;
  addSelection: (selection: Omit<Selection, 'id'>) => void;
  saveCurrentTicket: () => void;
  deleteTicket: (ticketId: string) => void;
  loadDemoTicket: (index?: number) => void;
  pendingAction: ProposedAction | null;
  setPendingAction: (action: ProposedAction | null) => void;
  confirmPendingAction: () => void;
  cancelPendingAction: () => void;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>(() => storage.getTickets());
  const [activeTicket, setActiveTicketState] = useState<Ticket | null>(() => {
    const savedId = storage.getActiveTicketId();
    const storedList = storage.getTickets();
    if (savedId) {
      const found = storedList.find((t) => t.id === savedId);
      if (found) return found;
    }
    return storedList[0] || DEMO_TICKETS[0];
  });

  const [pendingAction, setPendingAction] = useState<ProposedAction | null>(null);

  useEffect(() => {
    if (activeTicket) {
      storage.setActiveTicketId(activeTicket.id);
    }
  }, [activeTicket]);

  const setActiveTicket = (ticket: Ticket | null) => {
    setActiveTicketState(ticket);
    if (ticket) storage.setActiveTicketId(ticket.id);
  };

  const setActiveTicketById = (ticketId: string) => {
    const found = tickets.find((t) => t.id === ticketId);
    if (found) {
      setActiveTicket(found);
    }
  };

  const updateActiveTicket = (updates: Partial<Ticket>) => {
    if (!activeTicket) return;
    const updated: Ticket = {
      ...activeTicket,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // If selections changed, recalculate odds and payout
    if (updates.selections) {
      const odds = calculateCombinedOdds(updates.selections.map((s) => s.odds));
      const { potentialReturn, profit } = calculatePayout(updated.stake, odds);
      updated.totalOdds = odds;
      updated.potentialReturn = potentialReturn;
      updated.potentialProfit = profit;
      updated.impliedProbability = calculateImpliedProbability(odds);
    } else if (updates.stake !== undefined) {
      const { potentialReturn, profit } = calculatePayout(updates.stake, updated.totalOdds);
      updated.potentialReturn = potentialReturn;
      updated.potentialProfit = profit;
    }

    setActiveTicketState(updated);
  };

  const updateSelection = (selectionId: string, updates: Partial<Selection>) => {
    if (!activeTicket) return;
    const newSelections = activeTicket.selections.map((s) => {
      if (s.id === selectionId) {
        return {
          ...s,
          ...updates,
          // If user edits an uncertain field, clear the uncertainty flag
          uncertainFields: updates.odds ? [] : s.uncertainFields,
        };
      }
      return s;
    });

    updateActiveTicket({ selections: newSelections });
  };

  const removeSelection = (selectionId: string) => {
    if (!activeTicket) return;
    const newSelections = activeTicket.selections.filter((s) => s.id !== selectionId);
    updateActiveTicket({ selections: newSelections });
  };

  const addSelection = (selection: Omit<Selection, 'id'>) => {
    if (!activeTicket) return;
    const newSel: Selection = {
      ...selection,
      id: `sel-${Date.now()}`,
    };
    updateActiveTicket({ selections: [...activeTicket.selections, newSel] });
  };

  const saveCurrentTicket = () => {
    if (!activeTicket) return;
    storage.saveTicket(activeTicket);
    setTickets(storage.getTickets());
  };

  const deleteTicket = (ticketId: string) => {
    storage.deleteTicket(ticketId);
    const updated = storage.getTickets();
    setTickets(updated);
    if (activeTicket?.id === ticketId) {
      setActiveTicketState(updated[0] || null);
    }
  };

  const loadDemoTicket = (index: number = 0) => {
    const demo = DEMO_TICKETS[index % DEMO_TICKETS.length];
    if (demo) {
      const freshDemo: Ticket = {
        ...demo,
        id: `ticket-demo-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setActiveTicket(freshDemo);
      storage.saveTicket(freshDemo);
      setTickets(storage.getTickets());
    }
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;

    if (pendingAction.type === 'TRIM_TICKET' && pendingAction.payload) {
      const trimmedTicket = pendingAction.payload as Ticket;
      setActiveTicket(trimmedTicket);
      storage.saveTicket(trimmedTicket);
      setTickets(storage.getTickets());
    } else if (pendingAction.type === 'SPLIT_TICKET' && pendingAction.payload) {
      const splitTickets = pendingAction.payload as Ticket[];
      splitTickets.forEach((t) => storage.saveTicket(t));
      setTickets(storage.getTickets());
      if (splitTickets[0]) setActiveTicket(splitTickets[0]);
    } else if (pendingAction.type === 'CONVERT_TICKET' && pendingAction.payload) {
      const convertedTicket = pendingAction.payload as Ticket;
      setActiveTicket(convertedTicket);
      storage.saveTicket(convertedTicket);
      setTickets(storage.getTickets());
    } else if (pendingAction.type === 'CREATE_ALTERNATIVE' && pendingAction.payload) {
      const altTicket = pendingAction.payload as Ticket;
      setActiveTicket(altTicket);
      storage.saveTicket(altTicket);
      setTickets(storage.getTickets());
    } else if (pendingAction.type === 'DELETE_TICKET' && pendingAction.payload) {
      deleteTicket(pendingAction.payload);
    }

    setPendingAction(null);
  };

  const cancelPendingAction = () => {
    setPendingAction(null);
  };

  return (
    <TicketContext.Provider
      value={{
        tickets,
        activeTicket,
        setActiveTicket,
        setActiveTicketById,
        updateActiveTicket,
        updateSelection,
        removeSelection,
        addSelection,
        saveCurrentTicket,
        deleteTicket,
        loadDemoTicket,
        pendingAction,
        setPendingAction,
        confirmPendingAction,
        cancelPendingAction,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
};

export const useTicket = () => {
  const context = useContext(TicketContext);
  if (!context) throw new Error('useTicket must be used within a TicketProvider');
  return context;
};

import { Ticket, RolloverTracker, UserProfile, UserPreferences } from '../../shared/types/index.ts';
import { DEMO_TICKETS, DEMO_ROLLOVER } from '../../shared/constants/demoData.ts';
import { firebaseService, isFirebaseConfigured } from './firebase.ts';

const TICKETS_KEY = 'betpilot_tickets';
const ACTIVE_TICKET_KEY = 'betpilot_active_ticket_id';
const ROLLOVERS_KEY = 'betpilot_rollovers';
const PREFS_KEY = 'betpilot_user_prefs';
const USER_KEY = 'betpilot_user_profile';

const DEFAULT_PREFS: UserPreferences = {
  currency: 'NGN',
  defaultBookmaker: 'SportyBet',
  maxStakeLimit: 50000,
  sessionTimeLimitMinutes: 60,
  enableEvWarnings: true,
  responsibleGamblingMode: true,
};

const DEFAULT_USER: UserProfile = {
  id: 'usr_pilot_demo',
  email: 'trader@betpilot.ai',
  displayName: 'Alex O.',
  createdAt: new Date().toISOString(),
  preferences: DEFAULT_PREFS,
};

export const storage = {
  getUserProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    this.saveUserProfile(DEFAULT_USER);
    return DEFAULT_USER;
  },

  saveUserProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(profile));
    } catch (e) {}
  },

  getUserPreferences(): UserPreferences {
    const user = this.getUserProfile();
    return user.preferences || DEFAULT_PREFS;
  },

  saveUserPreferences(prefs: UserPreferences): void {
    const user = this.getUserProfile();
    user.preferences = prefs;
    this.saveUserProfile(user);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {}
  },

  getTickets(): Ticket[] {
    try {
      const stored = localStorage.getItem(TICKETS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    // Seed with demo tickets
    this.saveTickets(DEMO_TICKETS);
    return DEMO_TICKETS;
  },

  saveTickets(tickets: Ticket[]): void {
    try {
      localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
    } catch (e) {}
  },

  saveTicket(ticket: Ticket): void {
    const tickets = this.getTickets();
    const idx = tickets.findIndex((t) => t.id === ticket.id);
    const updated = { ...ticket, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      tickets[idx] = updated;
    } else {
      tickets.unshift(updated);
    }
    this.saveTickets(tickets);

    // Asynchronously mirror to Firestore if configured
    if (isFirebaseConfigured()) {
      const user = this.getUserProfile();
      firebaseService.saveTicket(user.id, updated).catch(() => {});
    }
  },

  deleteTicket(ticketId: string): void {
    const tickets = this.getTickets().filter((t) => t.id !== ticketId);
    this.saveTickets(tickets);
    if (this.getActiveTicketId() === ticketId) {
      this.setActiveTicketId(tickets[0]?.id || null);
    }

    // Mirror deletion to Firestore if configured
    if (isFirebaseConfigured()) {
      const user = this.getUserProfile();
      firebaseService.deleteTicket(user.id, ticketId).catch(() => {});
    }
  },

  getActiveTicketId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_TICKET_KEY);
    } catch (e) {
      return null;
    }
  },

  setActiveTicketId(id: string | null): void {
    try {
      if (id) localStorage.setItem(ACTIVE_TICKET_KEY, id);
      else localStorage.removeItem(ACTIVE_TICKET_KEY);
    } catch (e) {}
  },

  getRollovers(): RolloverTracker[] {
    try {
      const stored = localStorage.getItem(ROLLOVERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    this.saveRollovers([DEMO_ROLLOVER]);
    return [DEMO_ROLLOVER];
  },

  saveRollovers(rollovers: RolloverTracker[]): void {
    try {
      localStorage.setItem(ROLLOVERS_KEY, JSON.stringify(rollovers));
    } catch (e) {}
  },

  saveRollover(rollover: RolloverTracker): void {
    const list = this.getRollovers();
    const idx = list.findIndex((r) => r.id === rollover.id);
    if (idx >= 0) {
      list[idx] = { ...rollover, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...rollover, updatedAt: new Date().toISOString() });
    }
    this.saveRollovers(list);
  },
};

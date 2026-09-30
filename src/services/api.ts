import { Ticket, RolloverTracker, ResearchResult, BookmakerCapability } from '../../shared/types/index.ts';

export const api = {
  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  async sendChatMessage(payload: {
    message: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
    currentTicket?: Ticket;
    imageBase64?: string;
    mimeType?: string;
  }) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Server error processing request');
    }
    return res.json();
  },

  async extractTicketFromImage(payload: {
    imageBase64: string;
    mimeType?: string;
    bookmakerHint?: string;
  }) {
    const res = await fetch('/api/extract-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to extract ticket from image');
    }
    return res.json();
  },

  async runTool(toolName: string, params: any) {
    const res = await fetch(`/api/tools/${toolName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Tool error: ${toolName}`);
    }
    return res.json();
  },

  async getFixtures(query?: string): Promise<{
    success: boolean;
    fixtures: ResearchResult[];
    status: { connected: boolean; providerName: string; freshness: string; limitations: string[] };
  }> {
    const url = query ? `/api/sports/fixtures?q=${encodeURIComponent(query)}` : '/api/sports/fixtures';
    const res = await fetch(url);
    return res.json();
  },

  async getBookmakers(): Promise<{ success: boolean; bookmakers: BookmakerCapability[] }> {
    const res = await fetch('/api/bookmakers');
    return res.json();
  },

  async getDemoData(): Promise<{
    success: boolean;
    demoTickets: Ticket[];
    demoRollover: RolloverTracker;
  }> {
    const res = await fetch('/api/demo-data');
    return res.json();
  },

  async getDailyRollover() {
    const res = await fetch('/api/daily-rollover');
    return res.json();
  },

  async generateDailyRollover(params?: {
    date?: string;
    targetOddsMin?: number;
    targetOddsMax?: number;
    riskPreference?: 'conservative' | 'balanced' | 'higher_variance';
  }) {
    const res = await fetch('/api/daily-rollover/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
    });
    return res.json();
  },

  async recordRolloverDay(params: {
    rolloverId?: string;
    dayNumber?: number;
    date: string;
    slip?: any;
    stake?: number;
    status: 'PENDING' | 'READY' | 'WON' | 'LOST' | 'VOID' | 'SKIPPED';
    notes?: string;
  }) {
    const res = await fetch('/api/daily-rollover/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async getCandidateSelections(risk?: string) {
    const url = risk ? `/api/prediction/candidates?risk=${encodeURIComponent(risk)}` : '/api/prediction/candidates';
    const res = await fetch(url);
    return res.json();
  },

  async analyzeUrl(url: string) {
    const res = await fetch('/api/prediction/analyze-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return res.json();
  },

  async getPredictionHistory() {
    const res = await fetch('/api/prediction/history');
    return res.json();
  },
};

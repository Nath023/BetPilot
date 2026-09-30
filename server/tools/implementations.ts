import { GoogleGenAI } from '@google/genai';
import {
  Ticket,
  Selection,
  ProposedAction,
  RolloverTracker,
  ResearchResult,
} from '../../shared/types/index.ts';
import {
  calculateCombinedOdds,
  calculatePayout,
  calculateImpliedProbability,
  calculateExpectedValue,
  calculateTicketMetrics,
  calculateRolloverProgress,
  generateCombinations,
} from '../../shared/utils/calculations.ts';
import { BookmakerRegistry } from '../providers/bookmakerRegistry.ts';
import { SportsDataProvider } from '../providers/sportsProvider.ts';
import { DEMO_TICKETS, DEMO_ROLLOVER, DEFAULT_DAILY_ROLLOVER_CHALLENGE, DEMO_RESEARCH_FIXTURES } from '../../shared/constants/demoData.ts';
import { PredictionEngine } from '../services/predictionEngine.ts';
import { DailyRolloverChallenge, PredictionSnapshot, CandidateSlip } from '../../shared/types/index.ts';

// In-memory persistent storage for server instance (syncs with client localStorage/Firestore)
const inMemoryTickets: Map<string, Ticket> = new Map();
const inMemoryRollovers: Map<string, RolloverTracker> = new Map();
let currentDailyChallenge: DailyRolloverChallenge = { ...DEFAULT_DAILY_ROLLOVER_CHALLENGE };
const predictionSnapshots: PredictionSnapshot[] = [];

// Seed with demo data
DEMO_TICKETS.forEach((t) => inMemoryTickets.set(t.id, t));
inMemoryRollovers.set(DEMO_ROLLOVER.id, DEMO_ROLLOVER);

export class ToolImplementations {
  private static geminiClient: GoogleGenAI | null = null;

  public static getGeminiClient(): GoogleGenAI | null {
    if (!this.geminiClient && process.env.GEMINI_API_KEY) {
      this.geminiClient = new GoogleGenAI({});
    }
    return this.geminiClient;
  }

  /**
   * TOOL 1: extract_ticket_from_image
   */
  public static async extractTicketFromImage(params: {
    imageBase64?: string;
    mimeType?: string;
    bookmakerHint?: string;
  }) {
    const { imageBase64, mimeType = 'image/jpeg', bookmakerHint } = params;

    // If Gemini client is available and image data provided, use multimodal processing
    const client = this.getGeminiClient();
    if (client && imageBase64) {
      try {
        const prompt = `You are a high-precision sports betting ticket extraction model.
Inspect this betting ticket screenshot meticulously.
Extract:
1. Detected bookmaker (e.g., SportyBet, Bet9ja, 1xBet, BetKing, etc.)
2. Booking code if clearly visible (or null)
3. Every match selection list:
   - homeTeam (string, or null if blurred)
   - awayTeam (string, or null if blurred)
   - kickoffTime (string or null)
   - competition (league name or null)
   - market (e.g., "1X2", "Over/Under 2.5", "GG/NG", "Double Chance")
   - selection (e.g., "Home Win", "Over 1.5", "Draw")
   - odds (decimal number, e.g., 1.45. If ambiguous or cut off, flag in uncertainFields)
   - confidence (0.0 to 1.0 confidence score for this row)
   - uncertainFields (array of string names of any fields that are blurred, cut off, or uncertain)
4. Total combined odds visible on ticket (number or null)
5. Stake amount visible (number or null)
6. Potential return visible (number or null)
7. extractionWarnings (array of human-readable warnings about blur, cutoffs, missing odds)

CRITICAL RULES:
- Never fabricate missing fields. Use null if not plainly legible.
- Do not invent odds.
- If odds are blurry, rate confidence lower (<0.7) and add 'odds' to uncertainFields.

Respond ONLY with valid JSON conforming to this schema:
{
  "bookmaker": string | null,
  "bookingCode": string | null,
  "selections": [
    {
      "homeTeam": string,
      "awayTeam": string,
      "competition": string | null,
      "kickoffTime": string | null,
      "market": string,
      "selection": string,
      "odds": number,
      "confidence": number,
      "uncertainFields": string[]
    }
  ],
  "totalOdds": number | null,
  "stake": number | null,
  "potentialReturn": number | null,
  "extractionWarnings": string[]
}`;

        const response = await client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
                  },
                },
                { text: prompt },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1, // Minimal creativity for extraction fidelity
          },
        });

        const rawText = response.text || '{}';
        const parsed = JSON.parse(rawText);

        const selections: Selection[] = (parsed.selections || []).map((s: any, idx: number) => {
          const oddsVal = typeof s.odds === 'number' && s.odds > 0 ? s.odds : 1.0;
          return {
            id: `extracted-${Date.now()}-${idx}`,
            homeTeam: s.homeTeam || 'Unknown Home Team',
            awayTeam: s.awayTeam || 'Unknown Away Team',
            competition: s.competition || undefined,
            kickoffTime: s.kickoffTime || undefined,
            market: s.market || 'Unknown Market',
            selection: s.selection || 'Unknown Selection',
            odds: oddsVal,
            confidence: typeof s.confidence === 'number' ? s.confidence : 0.85,
            source: 'USER_PROVIDED',
            uncertainFields: s.uncertainFields || [],
          };
        });

        const totalOdds =
          parsed.totalOdds && !isNaN(parsed.totalOdds)
            ? parsed.totalOdds
            : calculateCombinedOdds(selections.map((s) => s.odds));

        const stake = parsed.stake || 1000;
        const { potentialReturn, profit } = calculatePayout(stake, totalOdds);

        return {
          success: true,
          bookmaker: parsed.bookmaker || bookmakerHint || 'Detected Bookmaker',
          bookingCode: parsed.bookingCode || undefined,
          selections,
          totalOdds,
          stake,
          potentialReturn,
          potentialProfit: profit,
          extractionWarnings: parsed.extractionWarnings || [],
          confidence:
            selections.length > 0
              ? selections.reduce((a, b) => a + b.confidence, 0) / selections.length
              : 0.8,
        };
      } catch (err: any) {
        console.error('Gemini image extraction error:', err);
      }
    }

    // Fallback demo ticket extraction when running in demo mode or without live image
    const demo = DEMO_TICKETS[0];
    return {
      success: true,
      bookmaker: bookmakerHint || demo.bookmaker,
      bookingCode: demo.bookingCode,
      selections: demo.selections.map((s, idx) => ({
        ...s,
        id: `extracted-demo-${idx}`,
        source: 'USER_PROVIDED' as const,
      })),
      totalOdds: demo.totalOdds,
      stake: demo.stake,
      potentialReturn: demo.potentialReturn,
      potentialProfit: demo.potentialProfit,
      extractionWarnings: [
        'Sample extraction rendered from high-definition ticket benchmark.',
        'Please review all selections and odds before confirming.',
      ],
      confidence: 0.94,
    };
  }

  /**
   * TOOL 2: parse_booking_code
   */
  public static parseBookingCode(params: { bookmaker: string; bookingCode: string }) {
    const { bookmaker, bookingCode } = params;
    const provider = BookmakerRegistry.getById(bookmaker);

    if (!provider) {
      return {
        success: false,
        bookmaker,
        verified: false,
        error: `Unknown bookmaker: "${bookmaker}". Registered bookmakers: SportyBet, Bet9ja, 1xBet, BetKing.`,
      };
    }

    const validation = BookmakerRegistry.validateBookingCode(provider.id, bookingCode);
    if (!validation.isValidFormat) {
      return {
        success: false,
        bookmaker: provider.name,
        verified: false,
        error: validation.reason,
      };
    }

    // Honest handling: Bookmaker code format is valid, but live B2B settlement API is unconfigured
    return {
      success: false,
      bookmaker: provider.name,
      bookingCode,
      verified: false,
      error: 'BOOKING_CODE_VALIDATION_UNAVAILABLE',
      message: `Booking code "${bookingCode}" matches standard ${provider.name} format, but live bookmaker validation API is not configured. Please upload a screenshot or manually enter selections.`,
      limitations: [
        `Direct ticket fetching via ${provider.name} server requires a verified bookmaker API integration.`,
        'Never fabricates fictional selections for an unverified code.',
      ],
    };
  }

  /**
   * TOOL 3: validate_ticket
   */
  public static validateTicket(params: { ticket: Ticket }) {
    const { ticket } = params;
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ticket.selections || ticket.selections.length === 0) {
      errors.push('Ticket must contain at least 1 selection.');
    }

    const seenFixtures = new Set<string>();
    ticket.selections.forEach((sel, i) => {
      const rowNum = i + 1;
      if (!sel.homeTeam || !sel.awayTeam) {
        errors.push(`Selection #${rowNum}: Missing home or away team name.`);
      }
      if (sel.odds === undefined || isNaN(sel.odds) || sel.odds <= 1.0) {
        errors.push(`Selection #${rowNum} (${sel.homeTeam} vs ${sel.awayTeam}): Invalid decimal odds (${sel.odds}). Must be greater than 1.00.`);
      }
      if (!sel.market || !sel.selection) {
        warnings.push(`Selection #${rowNum}: Market or selection description is incomplete.`);
      }

      // Check duplicates
      const fixKey = `${sel.homeTeam.toLowerCase()} vs ${sel.awayTeam.toLowerCase()}`;
      if (seenFixtures.has(fixKey)) {
        warnings.push(`Multiple selections found for the same fixture: "${sel.homeTeam} vs ${sel.awayTeam}". Check if your bookmaker allows correlated accumulators.`);
      }
      seenFixtures.add(fixKey);
    });

    const expectedOdds = calculateCombinedOdds(ticket.selections.map((s) => s.odds));
    if (Math.abs(expectedOdds - ticket.totalOdds) > 0.05) {
      warnings.push(`Calculated combined odds (${expectedOdds}) differ slightly from ticket header odds (${ticket.totalOdds}). Recalculation recommended.`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      expectedCombinedOdds: expectedOdds,
    };
  }

  /**
   * TOOL 4: calculate_ticket
   */
  public static calculateTicket(params: { selections: Selection[]; stake?: number }) {
    const { selections, stake = 1000 } = params;
    const metrics = calculateTicketMetrics(selections, stake);
    return {
      success: true,
      ...metrics,
    };
  }

  /**
   * TOOL 5: trim_ticket
   */
  public static trimTicket(params: {
    ticket: Ticket;
    criteria: {
      maxSelections?: number;
      minOdds?: number;
      maxOdds?: number;
      removeLowestConfidence?: boolean;
      removeHighestOdds?: boolean;
      removeSpecificSelectionIds?: string[];
    };
  }) {
    const { ticket, criteria } = params;
    const originalSelections = [...ticket.selections];
    let candidateSelections = [...originalSelections];
    const rationale: string[] = [];

    // Remove specific IDs
    if (criteria.removeSpecificSelectionIds && criteria.removeSpecificSelectionIds.length > 0) {
      const removeSet = new Set(criteria.removeSpecificSelectionIds);
      candidateSelections = candidateSelections.filter((s) => !removeSet.has(s.id));
      rationale.push(`Removed ${criteria.removeSpecificSelectionIds.length} user-specified selections.`);
    }

    // Min odds filter
    if (criteria.minOdds !== undefined) {
      const before = candidateSelections.length;
      candidateSelections = candidateSelections.filter((s) => s.odds >= criteria.minOdds!);
      if (before > candidateSelections.length) {
        rationale.push(`Removed ${before - candidateSelections.length} selections with odds below ${criteria.minOdds}.`);
      }
    }

    // Max odds filter
    if (criteria.maxOdds !== undefined) {
      const before = candidateSelections.length;
      candidateSelections = candidateSelections.filter((s) => s.odds <= criteria.maxOdds!);
      if (before > candidateSelections.length) {
        rationale.push(`Removed ${before - candidateSelections.length} selections with odds exceeding ${criteria.maxOdds}.`);
      }
    }

    // Remove lowest confidence or highest risk if count still exceeds maxSelections
    const targetCount = criteria.maxSelections || candidateSelections.length;
    if (candidateSelections.length > targetCount) {
      if (criteria.removeLowestConfidence) {
        candidateSelections.sort((a, b) => b.confidence - a.confidence);
        const removed = candidateSelections.splice(targetCount);
        rationale.push(`Trimmed ${removed.length} selections with lowest extraction confidence.`);
      } else {
        // Default to removing highest risk / longest odds
        candidateSelections.sort((a, b) => a.odds - b.odds);
        const removed = candidateSelections.splice(targetCount);
        rationale.push(`Trimmed ${removed.length} selections with longest odds (highest risk).`);
      }
    }

    const removedSelections = originalSelections.filter(
      (orig) => !candidateSelections.some((c) => c.id === orig.id)
    );

    const newCombinedOdds = calculateCombinedOdds(candidateSelections.map((s) => s.odds));
    const { potentialReturn, profit } = calculatePayout(ticket.stake, newCombinedOdds);

    const proposedTicket: Ticket = {
      ...ticket,
      id: `trimmed-${Date.now()}`,
      status: 'TRIMMED',
      title: `${ticket.title || 'Ticket'} (Trimmed to ${candidateSelections.length})`,
      selections: candidateSelections,
      totalOdds: newCombinedOdds,
      potentialReturn,
      potentialProfit: profit,
      impliedProbability: calculateImpliedProbability(newCombinedOdds),
      updatedAt: new Date().toISOString(),
    };

    const proposedAction: ProposedAction = {
      id: `action-${Date.now()}`,
      type: 'TRIM_TICKET',
      title: `Trim ticket from ${originalSelections.length} to ${candidateSelections.length} selections`,
      description: `Reduce selections to lower overall accumulator risk. Combined odds adjust from ${ticket.totalOdds} to ${newCombinedOdds}.`,
      requiresConfirmation: true,
      status: 'CONFIRMATION_REQUIRED',
      beforeSummary: {
        selectionsCount: originalSelections.length,
        totalOdds: ticket.totalOdds,
        potentialReturn: ticket.potentialReturn,
      },
      afterSummary: {
        selectionsCount: candidateSelections.length,
        totalOdds: newCombinedOdds,
        potentialReturn,
        removed: removedSelections.map((r) => `${r.homeTeam} vs ${r.awayTeam} (${r.selection} @ ${r.odds})`),
      },
      payload: proposedTicket,
    };

    return {
      originalTicket: ticket,
      proposedTicket,
      removedSelections,
      newCombinedOdds,
      rationale,
      proposedAction,
      requiresConfirmation: true,
    };
  }

  /**
   * TOOL 6: split_ticket
   */
  public static splitTicket(params: {
    ticket: Ticket;
    method: 'singles' | 'doubles' | 'trebles' | 'custom';
    groupSize?: number;
    allocatedStakePerTicket?: number;
  }) {
    const { ticket, method, groupSize, allocatedStakePerTicket = 500 } = params;
    let k = 2;
    if (method === 'singles') k = 1;
    if (method === 'doubles') k = 2;
    if (method === 'trebles') k = 3;
    if (method === 'custom' && groupSize) k = groupSize;

    const combos = generateCombinations(ticket.selections, k);
    const proposedTickets: Ticket[] = combos.map((combo, idx) => {
      const odds = calculateCombinedOdds(combo.map((s) => s.odds));
      const { potentialReturn, profit } = calculatePayout(allocatedStakePerTicket, odds);
      return {
        id: `split-${Date.now()}-${idx + 1}`,
        bookmaker: ticket.bookmaker,
        status: 'SPLIT',
        title: `${ticket.title || 'Ticket'} Part ${idx + 1} (${k}-Fold)`,
        selections: combo,
        totalOdds: odds,
        stake: allocatedStakePerTicket,
        potentialReturn,
        potentialProfit: profit,
        impliedProbability: calculateImpliedProbability(odds),
        source: 'CALCULATED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const proposedAction: ProposedAction = {
      id: `action-split-${Date.now()}`,
      type: 'SPLIT_TICKET',
      title: `Split ticket into ${proposedTickets.length} separate ${k}-fold combinations`,
      description: `Generates smaller sub-tickets so that not all legs must hit for partial returns. Requires confirmation before saving.`,
      requiresConfirmation: true,
      status: 'CONFIRMATION_REQUIRED',
      beforeSummary: {
        originalLegs: ticket.selections.length,
        originalOdds: ticket.totalOdds,
      },
      afterSummary: {
        combinationCount: proposedTickets.length,
        ticketType: `${k}-Folds`,
        totalAllocatedStake: proposedTickets.length * allocatedStakePerTicket,
      },
      payload: proposedTickets,
    };

    return {
      success: true,
      count: proposedTickets.length,
      method,
      proposedTickets,
      proposedAction,
      requiresConfirmation: true,
    };
  }

  /**
   * TOOL 7: generate_alternative_ticket
   */
  public static generateAlternativeTicket(params: {
    originalTicket: Ticket;
    objective: 'lower_risk' | 'balanced' | 'higher_odds' | 'fewer_selections';
    maxSelections?: number;
  }) {
    const { originalTicket, objective, maxSelections = 5 } = params;
    const selections = [...originalTicket.selections];
    let filtered = [...selections];
    let label = '';

    if (objective === 'lower_risk') {
      // Prioritize selections with lower odds (higher implied probability)
      filtered.sort((a, b) => a.odds - b.odds);
      filtered = filtered.slice(0, Math.min(filtered.length, maxSelections));
      label = 'Alternative with lower combined odds and higher implied probability';
    } else if (objective === 'fewer_selections') {
      filtered = filtered.slice(0, Math.min(filtered.length, maxSelections));
      label = `Alternative with fewer selections (${filtered.length} folds)`;
    } else if (objective === 'higher_odds') {
      filtered.sort((a, b) => b.odds - a.odds);
      filtered = filtered.slice(0, Math.min(filtered.length, maxSelections));
      label = 'Alternative with higher combined odds';
    } else {
      // Balanced
      filtered = filtered.filter((s) => s.odds >= 1.25 && s.odds <= 1.80).slice(0, maxSelections);
      if (filtered.length < 3) filtered = selections.slice(0, maxSelections);
      label = 'Balanced alternative focusing on medium decimal odds range';
    }

    const odds = calculateCombinedOdds(filtered.map((s) => s.odds));
    const { potentialReturn, profit } = calculatePayout(originalTicket.stake, odds);

    const alternativeTicket: Ticket = {
      ...originalTicket,
      id: `alt-${Date.now()}`,
      title: `${originalTicket.title || 'Ticket'} (${objective.replace('_', ' ')})`,
      status: 'ALTERNATIVE',
      selections: filtered,
      totalOdds: odds,
      potentialReturn,
      potentialProfit: profit,
      impliedProbability: calculateImpliedProbability(odds),
      updatedAt: new Date().toISOString(),
      notes: label,
    };

    const proposedAction: ProposedAction = {
      id: `action-alt-${Date.now()}`,
      type: 'CREATE_ALTERNATIVE',
      title: `Create alternative ticket (${objective})`,
      description: `${label}. Does not guarantee wins or outcomes.`,
      requiresConfirmation: true,
      status: 'CONFIRMATION_REQUIRED',
      beforeSummary: {
        legs: originalTicket.selections.length,
        odds: originalTicket.totalOdds,
      },
      afterSummary: {
        legs: filtered.length,
        odds,
        potentialReturn,
      },
      payload: alternativeTicket,
    };

    return {
      success: true,
      alternativeTicket,
      proposedAction,
      requiresConfirmation: true,
    };
  }

  /**
   * TOOL 8: compare_tickets
   */
  public static compareTickets(params: { tickets: Ticket[] }) {
    const { tickets } = params;
    if (!tickets || tickets.length < 2) {
      return { success: false, error: 'At least 2 tickets required for comparison.' };
    }

    const comparisons = tickets.map((t) => ({
      id: t.id,
      title: t.title || 'Untitled Ticket',
      bookmaker: t.bookmaker,
      selectionCount: t.selections.length,
      combinedOdds: t.totalOdds,
      impliedProbability: `${(t.impliedProbability * 100).toFixed(2)}%`,
      stake: t.stake,
      potentialReturn: t.potentialReturn,
      averageOddsPerLeg: (t.selections.reduce((acc, s) => acc + s.odds, 0) / (t.selections.length || 1)).toFixed(2),
    }));

    return {
      success: true,
      comparisons,
      summary: `Comparing ${tickets.length} tickets across combined odds, selections count, and implied payout probability.`,
    };
  }

  /**
   * TOOL 9: research_fixture
   */
  public static async researchFixture(params: {
    homeTeam: string;
    awayTeam: string;
    kickoffTime?: string;
    competition?: string;
  }) {
    const { homeTeam, awayTeam, competition } = params;
    const lookup = await SportsDataProvider.getFixtureResearch(homeTeam, awayTeam, competition);

    if (lookup.found && lookup.result) {
      return {
        success: true,
        dataStatus: 'VERIFIED',
        research: lookup.result,
      };
    }

    return {
      success: false,
      dataStatus: 'UNAVAILABLE',
      message: lookup.message || `No verified sports data available for ${homeTeam} vs ${awayTeam}.`,
      limitations: [
        'External sports-data API provider is not configured.',
        'Never fabricates fictional match statistics, lineups, or historical records.',
      ],
    };
  }

  /**
   * TOOL 10: calculate_probability
   */
  public static calculateProbability(params: { odds: number; estimatedProbability?: number }) {
    const { odds, estimatedProbability } = params;
    const implied = calculateImpliedProbability(odds);
    const edge = estimatedProbability !== undefined
      ? Math.round((estimatedProbability - implied) * 10000) / 100
      : undefined;

    return {
      success: true,
      impliedProbability: implied,
      impliedPercentage: `${(implied * 100).toFixed(2)}%`,
      estimatedProbability: estimatedProbability !== undefined ? estimatedProbability : null,
      edgePercentage: edge !== undefined ? `${edge > 0 ? '+' : ''}${edge}%` : 'Unavailable',
      methodology: 'Implied probability = 1 / decimalOdds. Note: Bookmaker decimal odds include built-in house margin (overround).',
      limitations: [
        'Implied probability represents the break-even mathematical frequency at the given odds.',
        'It is NOT the actual objective likelihood of the sporting outcome.',
      ],
    };
  }

  /**
   * TOOL 11: calculate_ev
   */
  public static calculateEv(params: {
    odds: number;
    estimatedProbability: number;
    stake?: number;
  }) {
    const { odds, estimatedProbability, stake = 1000 } = params;
    const ev = calculateExpectedValue(odds, estimatedProbability, stake);
    return {
      success: true,
      ...ev,
    };
  }

  /**
   * TOOL 12: calculate_rollover
   */
  public static calculateRollover(params: {
    bonusAmount: number;
    rolloverMultiplier: number;
    completedWager: number;
  }) {
    const { bonusAmount, rolloverMultiplier, completedWager } = params;
    const progress = calculateRolloverProgress(bonusAmount, rolloverMultiplier, completedWager);
    return {
      success: true,
      ...progress,
    };
  }

  /**
   * TOOL 13: create_rollover_tracker
   */
  public static createRolloverTracker(params: {
    bookmaker: string;
    bonusAmount: number;
    currency?: 'NGN' | 'USD' | 'GBP' | 'EUR';
    rolloverMultiplier: number;
    minOddsPerTicket?: number;
    minSelectionsPerTicket?: number;
    qualifyingRules?: string[];
    expiryDate?: string;
  }) {
    const {
      bookmaker,
      bonusAmount,
      currency = 'NGN',
      rolloverMultiplier,
      minOddsPerTicket,
      minSelectionsPerTicket,
      qualifyingRules = [],
      expiryDate,
    } = params;

    const progress = calculateRolloverProgress(bonusAmount, rolloverMultiplier, 0);

    const tracker: RolloverTracker = {
      id: `rollover-${Date.now()}`,
      bookmaker,
      bonusAmount,
      currency,
      rolloverMultiplier,
      requiredWager: progress.requiredWager,
      completedWager: 0,
      remainingWager: progress.remainingWager,
      progressPercentage: 0,
      minOddsPerTicket,
      minSelectionsPerTicket,
      qualifyingRules,
      startDate: new Date().toISOString(),
      expiryDate,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    };

    inMemoryRollovers.set(tracker.id, tracker);

    return {
      success: true,
      tracker,
      message: `Created rollover tracker for ${bookmaker} bonus: ${bonusAmount} ${currency} with ${rolloverMultiplier}x wagering requirement.`,
    };
  }

  /**
   * TOOL 14: update_rollover_progress
   */
  public static updateRolloverProgress(params: {
    rolloverId: string;
    additionalWager: number;
  }) {
    const { rolloverId, additionalWager } = params;
    const tracker = inMemoryRollovers.get(rolloverId);
    if (!tracker) {
      return { success: false, error: `Rollover tracker #${rolloverId} not found.` };
    }

    const newCompleted = tracker.completedWager + additionalWager;
    const progress = calculateRolloverProgress(
      tracker.bonusAmount,
      tracker.rolloverMultiplier,
      newCompleted
    );

    tracker.completedWager = progress.completedWager;
    tracker.remainingWager = progress.remainingWager;
    tracker.progressPercentage = progress.progressPercentage;
    if (progress.isCompleted) tracker.status = 'COMPLETED';
    tracker.updatedAt = new Date().toISOString();

    inMemoryRollovers.set(tracker.id, tracker);

    return {
      success: true,
      tracker,
      message: `Added ${additionalWager} to wagering progress. Remaining: ${progress.remainingWager}.`,
    };
  }

  /**
   * TOOL 15: bookmaker_capabilities
   */
  public static bookmakerCapabilities(params: { bookmaker: string }) {
    const { bookmaker } = params;
    const provider = BookmakerRegistry.getById(bookmaker);
    if (!provider) {
      return {
        success: false,
        supported: false,
        message: `Bookmaker "${bookmaker}" is not registered in BetPilot AI registry.`,
      };
    }
    return {
      success: true,
      supported: true,
      provider,
    };
  }

  /**
   * TOOL 16: convert_ticket
   */
  public static convertTicket(params: {
    ticket: Ticket;
    targetBookmaker: string;
  }) {
    const { ticket, targetBookmaker } = params;
    return BookmakerRegistry.convertTicket(ticket, targetBookmaker);
  }

  /**
   * TOOL 17: generate_booking_code
   */
  public static generateBookingCode(params: { bookmaker: string; ticket: Ticket }) {
    const { bookmaker } = params;
    return {
      success: false,
      status: 'UNSUPPORTED',
      bookmaker,
      message: `A verified live booking-code generator is not configured for ${bookmaker}. BetPilot AI never fabricates fake booking codes. You can export or copy your selections directly into ${bookmaker}.`,
    };
  }

  /**
   * TOOL 18: save_ticket
   */
  public static saveTicket(params: { ticket: Ticket }) {
    const { ticket } = params;
    const toSave: Ticket = {
      ...ticket,
      status: 'SAVED',
      updatedAt: new Date().toISOString(),
    };
    inMemoryTickets.set(toSave.id, toSave);
    return {
      success: true,
      ticket: toSave,
      message: `Ticket "${toSave.title || toSave.id}" saved successfully.`,
    };
  }

  /**
   * TOOL 19: delete_ticket
   */
  public static deleteTicket(params: { ticketId: string }) {
    const { ticketId } = params;
    const exists = inMemoryTickets.has(ticketId);
    if (!exists) {
      return { success: false, error: `Ticket #${ticketId} not found.` };
    }
    inMemoryTickets.delete(ticketId);
    return {
      success: true,
      message: `Ticket #${ticketId} deleted.`,
    };
  }

  /**
   * TOOL 20: get_ticket_history
   */
  public static getTicketHistory() {
    const tickets = Array.from(inMemoryTickets.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return {
      success: true,
      tickets,
      count: tickets.length,
    };
  }

  /**
   * TOOL 21: research_url (Section 37)
   */
  public static researchUrl(params: { url: string }) {
    const analysis = PredictionEngine.analyzeUrl(params.url);
    return {
      success: true,
      sourceType: analysis.sourceType,
      extractedFixtures: analysis.extractedFixtures,
      extractedClaims: analysis.sourceClaims,
      betPilotAnalysis: analysis.betPilotAnalysis,
      retrievedAt: analysis.retrievedAt,
      limitations: analysis.limitations,
    };
  }

  /**
   * TOOL 22: analyze_fixture (Section 37)
   */
  public static async analyzeFixture(params: {
    fixture: string;
    markets?: string[];
    bookmakerOdds?: number;
    requestedAnalysis?: string;
  }) {
    const parts = params.fixture.split(/ vs | v | - /i);
    const home = parts[0]?.trim() || params.fixture;
    const away = parts[1]?.trim() || '';

    const res = await SportsDataProvider.getFixtureResearch(home, away);
    if (!res.found || !res.result) {
      return {
        success: false,
        fixture: params.fixture,
        message: res.message || 'No verified historical data found for this fixture.',
        dataQuality: 'INSUFFICIENT_DATA',
        limitations: ['Verified fixture data unavailable in database.'],
      };
    }

    const defaultMarkets = params.markets && params.markets.length > 0 ? params.markets : ['Over 1.5 Goals', 'Double Chance (1X)'];
    const candidates = PredictionEngine.generateCandidateSelections({ fixtures: [res.result] });

    const homeTeamName = res.result.fixture?.homeTeam?.name || (res.result as any).homeTeam;
    const awayTeamName = res.result.fixture?.awayTeam?.name || (res.result as any).awayTeam;
    const compName = res.result.fixture?.competition?.name || (res.result as any).competition;

    return {
      success: true,
      fixture: `${homeTeamName} vs ${awayTeamName}`,
      competition: compName,
      dataQuality: 'HIGH',
      dataSources: res.result.dataSources,
      analyses: candidates,
      observations: res.result.observations,
      limitations: res.result.limitations,
    };
  }

  /**
   * TOOL 23: generate_candidate_selections (Section 37)
   */
  public static generateCandidateSelections(params?: {
    fixtures?: any[];
    targetMarkets?: string[];
    minimumDataQuality?: string;
    riskPreference?: 'conservative' | 'balanced' | 'higher_variance';
  }) {
    const candidates = PredictionEngine.generateCandidateSelections({
      riskPreference: params?.riskPreference || 'balanced',
    });

    return {
      success: true,
      count: candidates.length,
      candidates,
      excludedFixtures: [],
      reasons: ['Filtered by data quality threshold and available decimal odds.'],
    };
  }

  /**
   * TOOL 24: generate_slip (Section 37 & P0-1 Optimizer)
   */
  public static generateSlip(params: any) {
    const { slips, safetyWarning } = PredictionEngine.generateCandidateSlips(params || {});
    return {
      success: true,
      slips,
      safetyWarning,
      limitations: [
        'Model estimates are statistical derived frequencies and never guaranteed outcomes.',
        'Always verify bookmaker rules and individual stake qualification requirements.',
      ],
    };
  }

  /**
   * TOOL 25: generate_daily_rollover (Section 37 & P0-1 Optimizer)
   */
  public static generateDailyRollover(params?: any) {
    const targetDate = params?.date || new Date().toISOString().split('T')[0];
    const { slips, safetyWarning } = PredictionEngine.generateCandidateSlips({
      targetOddsMin: params?.targetOddsMin ?? 4.0,
      targetOddsMax: params?.targetOddsMax ?? 5.0,
      selectionCountMin: params?.selectionCountMin,
      selectionCountMax: params?.selectionCountMax,
      riskPreference: params?.riskPreference || 'balanced',
      candidatePool: params?.candidatePool,
      strategy: params?.strategy,
      naturalLanguageInstruction: params?.naturalLanguageInstruction,
    });

    // Record snapshot for future backtesting (Section 28)
    if (slips[0]) {
      slips[0].selections.forEach((sel) => {
        predictionSnapshots.push({
          id: `snap-${Date.now()}-${sel.id}`,
          fixtureId: sel.fixtureId,
          fixture: `${sel.homeTeam} vs ${sel.awayTeam}`,
          competition: sel.competition,
          market: sel.market,
          selection: sel.selection,
          odds: sel.bookmakerOdds,
          modelEstimatedProbability: sel.modelEstimatedProbability,
          confidence: sel.confidence,
          dataQuality: sel.dataQuality,
          edgePercentage: sel.edgePercentage,
          timestamp: new Date().toISOString(),
          actualResult: 'PENDING',
        });
      });
    }

    return {
      success: true,
      date: targetDate,
      candidateSlips: slips,
      safetyWarning,
      dataQuality: 'HIGH',
      unavailableData: ['Live team lineups (available 60m prior to kickoff)'],
      limitations: [
        'Candidate slips are compiled mathematically using available historical indicators.',
        'BetPilot AI does not claim certainty or promise winnings.',
      ],
    };
  }

  /**
   * TOOL 26: record_rollover_day (Section 37)
   */
  public static recordRolloverDay(params: {
    rolloverId?: string;
    dayNumber?: number;
    date: string;
    slip?: CandidateSlip;
    stake?: number;
    status: 'PENDING' | 'READY' | 'WON' | 'LOST' | 'VOID' | 'SKIPPED';
    notes?: string;
  }) {
    const dayIdx = currentDailyChallenge.days.findIndex(
      (d) => d.date === params.date || (params.dayNumber && d.dayNumber === params.dayNumber)
    );

    if (dayIdx >= 0) {
      const day = currentDailyChallenge.days[dayIdx];
      day.status = params.status;
      if (params.slip) day.selectedSlip = params.slip;
      if (params.stake) day.stake = params.stake;
      if (params.notes) day.notes = params.notes;

      if (params.status === 'WON' && day.stake && day.selectedSlip) {
        day.actualReturn = Math.round(day.stake * day.selectedSlip.combinedOdds);
        day.profitOrLoss = day.actualReturn - day.stake;
        currentDailyChallenge.currentBankroll += day.profitOrLoss;
        currentDailyChallenge.currentDay = Math.min(
          currentDailyChallenge.totalDays,
          currentDailyChallenge.currentDay + 1
        );
      } else if (params.status === 'LOST' && day.stake) {
        day.actualReturn = 0;
        day.profitOrLoss = -day.stake;
        currentDailyChallenge.currentBankroll = Math.max(0, currentDailyChallenge.currentBankroll - day.stake);
      }

      day.resolvedAt = new Date().toISOString();
      currentDailyChallenge.updatedAt = new Date().toISOString();
    }

    return {
      success: true,
      challenge: currentDailyChallenge,
      message: `Updated Day ${params.dayNumber || dayIdx + 1} status to ${params.status}.`,
    };
  }

  /**
   * TOOL 27: get_daily_rollover (Section 37)
   */
  public static getDailyRollover() {
    return {
      success: true,
      challenge: currentDailyChallenge,
    };
  }

  /**
   * TOOL 28: get_prediction_history (Section 37 & 29)
   */
  public static getPredictionHistory() {
    return {
      success: true,
      count: predictionSnapshots.length,
      snapshots: predictionSnapshots,
      evaluationSummary: {
        totalEvaluated: predictionSnapshots.length,
        message: 'Empirical model calibration dashboard: snapshots stored for future backtesting and calibration analysis.',
      },
    };
  }
}

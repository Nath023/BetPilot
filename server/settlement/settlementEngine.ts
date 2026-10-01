import { Ticket, Selection, NormalizedMatchResult } from '../../shared/types/index.ts';
import { MarketSettler } from './marketSettler.ts';
import { ResultProvider } from './resultProvider.ts';

export interface TicketSettlementResult {
  ticket: Ticket;
  previousStatus: string;
  newStatus: 'WON' | 'LOST' | 'VOID' | 'PENDING';
  settledSelectionsCount: number;
  totalSelectionsCount: number;
  isFullySettled: boolean;
  settledOdds: number;
  actualReturn: number;
  summaryMessage: string;
}

/**
 * SettlementEngine: Manages automated and verified settlement of tickets.
 * Fully deterministic, idempotent, and non-destructive.
 */
export class SettlementEngine {
  /**
   * Settles a single ticket against available match results.
   */
  public static async settleTicket(
    ticket: Ticket,
    customResults?: NormalizedMatchResult[]
  ): Promise<TicketSettlementResult> {
    const previousStatus = ticket.settlementStatus || (ticket.status === 'WON' || ticket.status === 'LOST' || ticket.status === 'VOID' ? ticket.status : 'PENDING');

    // Create shallow copy with deep cloned selections to avoid modifying inputs in place prematurely
    const updatedSelections: Selection[] = await Promise.all(
      ticket.selections.map(async (selection) => {
        // If selection was already settled and marked with result, do not overwrite unless forced
        if (selection.status === 'WON' || selection.status === 'LOST' || selection.status === 'VOID') {
          return { ...selection };
        }

        // Look up result
        let matchResult: NormalizedMatchResult | null = null;
        if (customResults) {
          matchResult =
            customResults.find(
              (r) =>
                (selection.fixtureId && r.fixtureId === selection.fixtureId) ||
                (r.homeTeam.toLowerCase() === selection.homeTeam.toLowerCase() &&
                  r.awayTeam.toLowerCase() === selection.awayTeam.toLowerCase())
            ) || null;
        }

        if (!matchResult) {
          matchResult = await ResultProvider.getMatchResult(
            selection.fixtureId,
            selection.homeTeam,
            selection.awayTeam
          );
        }

        const evaluation = MarketSettler.evaluateSelection(selection, matchResult);

        return {
          ...selection,
          status: evaluation.status,
          settledAt: evaluation.settledAt || selection.settledAt,
          resultScore: evaluation.resultScore || selection.resultScore,
          resultDetails: evaluation.reason,
        };
      })
    );

    // Evaluate overall ticket status
    let hasLost = false;
    let hasPending = false;
    let wonCount = 0;
    let voidCount = 0;

    let recalculatedOdds = 1.0;

    for (const sel of updatedSelections) {
      if (sel.status === 'LOST') {
        hasLost = true;
      } else if (sel.status === 'PENDING' || !sel.status) {
        hasPending = true;
      } else if (sel.status === 'WON') {
        wonCount++;
        recalculatedOdds *= sel.odds;
      } else if (sel.status === 'VOID') {
        voidCount++;
        // Odds for VOID selection are reset to 1.00 in accumulator
        recalculatedOdds *= 1.0;
      }
    }

    let finalSettlementStatus: 'WON' | 'LOST' | 'VOID' | 'PENDING' = 'PENDING';
    let settledOdds = Math.round(recalculatedOdds * 100) / 100;
    let actualReturn = 0;
    let summaryMessage = '';

    if (hasLost) {
      finalSettlementStatus = 'LOST';
      settledOdds = 0;
      actualReturn = 0;
      summaryMessage = 'Ticket settled as LOST (one or more selections failed).';
    } else if (hasPending) {
      finalSettlementStatus = 'PENDING';
      settledOdds = ticket.totalOdds;
      actualReturn = 0;
      summaryMessage = `Settlement in progress: ${wonCount + voidCount} of ${updatedSelections.length} selections settled.`;
    } else if (wonCount + voidCount === updatedSelections.length) {
      if (wonCount === 0 && voidCount > 0) {
        // All selections VOID -> stake refunded
        finalSettlementStatus = 'VOID';
        settledOdds = 1.0;
        actualReturn = ticket.stake;
        summaryMessage = 'All selections VOID. Full stake refunded.';
      } else {
        // At least one won, remainder void -> Ticket WON with adjusted odds
        finalSettlementStatus = 'WON';
        actualReturn = Math.round(ticket.stake * settledOdds);
        summaryMessage =
          voidCount > 0
            ? `Ticket settled as WON! (Adjusted for ${voidCount} VOID selection(s), final odds: ${settledOdds.toFixed(2)}x).`
            : `Ticket settled as WON! All ${wonCount} selections verified (odds: ${settledOdds.toFixed(2)}x).`;
      }
    }

    const settledTicket: Ticket = {
      ...ticket,
      selections: updatedSelections,
      settlementStatus: finalSettlementStatus,
      status:
        finalSettlementStatus === 'WON'
          ? 'WON'
          : finalSettlementStatus === 'LOST'
          ? 'LOST'
          : finalSettlementStatus === 'VOID'
          ? 'VOID'
          : ticket.status,
      settledAt: finalSettlementStatus !== 'PENDING' ? new Date().toISOString() : ticket.settledAt,
      settledOdds,
      actualReturn,
      settlementSource: 'AUTOMATED_VERIFICATION',
      updatedAt: new Date().toISOString(),
    };

    return {
      ticket: settledTicket,
      previousStatus,
      newStatus: finalSettlementStatus,
      settledSelectionsCount: wonCount + voidCount + (hasLost ? 1 : 0),
      totalSelectionsCount: updatedSelections.length,
      isFullySettled: finalSettlementStatus !== 'PENDING',
      settledOdds,
      actualReturn,
      summaryMessage,
    };
  }

  /**
   * Batch settle multiple tickets in parallel
   */
  public static async settleTickets(
    tickets: Ticket[],
    customResults?: NormalizedMatchResult[]
  ): Promise<TicketSettlementResult[]> {
    return Promise.all(tickets.map((t) => this.settleTicket(t, customResults)));
  }
}

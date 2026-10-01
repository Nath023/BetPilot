import {
  DailyRolloverChallenge,
  DailyRolloverDay,
  Ticket,
  NormalizedMatchResult,
} from '../../shared/types/index.ts';
import { SettlementEngine, TicketSettlementResult } from './settlementEngine.ts';

export interface RolloverSettlementResult {
  challenge: DailyRolloverChallenge;
  settledDay: DailyRolloverDay;
  ticketSettlement: TicketSettlementResult;
  advancedToDay: number;
  isChallengeComplete: boolean;
  isChallengeFailed: boolean;
  isDuplicateCallPrevented: boolean;
  message: string;
}

/**
 * RolloverSettler: Coordinates bet settlement with the user's active rollover challenge.
 * Ensures strict idempotency, prevents duplicate day advancement, and updates bankrolls accurately.
 */
export class RolloverSettler {
  public static async settleRolloverDay(
    challenge: DailyRolloverChallenge,
    ticket: Ticket,
    dayNumber?: number,
    customResults?: NormalizedMatchResult[]
  ): Promise<RolloverSettlementResult> {
    const targetDayNumber = dayNumber ?? challenge.currentDay;
    const targetDayIndex = challenge.days.findIndex((d) => d.dayNumber === targetDayNumber);

    if (targetDayIndex === -1) {
      throw new Error(`Day ${targetDayNumber} not found in challenge "${challenge.title}"`);
    }

    const currentDayEntry = challenge.days[targetDayIndex];

    // 1. Idempotency Check: Prevent duplicate settlement or advancement
    if (currentDayEntry.status === 'WON' || currentDayEntry.status === 'LOST') {
      return {
        challenge,
        settledDay: currentDayEntry,
        ticketSettlement: await SettlementEngine.settleTicket(ticket, customResults),
        advancedToDay: challenge.currentDay,
        isChallengeComplete: challenge.status === 'COMPLETED',
        isChallengeFailed: challenge.status === 'FAILED',
        isDuplicateCallPrevented: true,
        message: `Day ${targetDayNumber} was already resolved as ${currentDayEntry.status}. Duplicate settlement safely ignored.`,
      };
    }

    // 2. Settle the underlying ticket
    const ticketSettlement = await SettlementEngine.settleTicket(ticket, customResults);
    const settledTicket = ticketSettlement.ticket;

    // If ticket is still pending, day cannot be finalized
    if (ticketSettlement.newStatus === 'PENDING') {
      return {
        challenge,
        settledDay: currentDayEntry,
        ticketSettlement,
        advancedToDay: challenge.currentDay,
        isChallengeComplete: false,
        isChallengeFailed: false,
        isDuplicateCallPrevented: false,
        message: `Day ${targetDayNumber} ticket is still in progress (${ticketSettlement.summaryMessage}).`,
      };
    }

    // 3. Clone challenge and day entry for immutable update
    const updatedDays = [...challenge.days];
    const stake = currentDayEntry.stake ?? settledTicket.stake ?? challenge.currentBankroll;

    let updatedBankroll = challenge.currentBankroll;
    let nextDayNumber = challenge.currentDay;
    let newChallengeStatus: 'ACTIVE' | 'COMPLETED' | 'FAILED' = challenge.status;
    let dayStatus: 'WON' | 'LOST' | 'VOID' = 'WON';
    let actualReturn = 0;
    let profitOrLoss = 0;
    let message = '';

    if (ticketSettlement.newStatus === 'WON') {
      dayStatus = 'WON';
      actualReturn = Math.round(stake * ticketSettlement.settledOdds);
      profitOrLoss = actualReturn - stake;
      updatedBankroll = challenge.currentBankroll - stake + actualReturn;

      if (challenge.currentDay >= challenge.totalDays) {
        newChallengeStatus = 'COMPLETED';
        message = `Rollover Day ${targetDayNumber} WON! Target multiplier achieved! Challenge completed.`;
      } else {
        nextDayNumber = challenge.currentDay + 1;
        message = `Rollover Day ${targetDayNumber} WON! Bankroll increased to ${updatedBankroll}. Advancing to Day ${nextDayNumber}.`;

        // Ensure next day exists in days array or initialize it
        const nextDayIdx = updatedDays.findIndex((d) => d.dayNumber === nextDayNumber);
        if (nextDayIdx >= 0) {
          updatedDays[nextDayIdx] = {
            ...updatedDays[nextDayIdx],
            status: 'READY',
            stake: updatedBankroll,
          };
        } else {
          updatedDays.push({
            dayNumber: nextDayNumber,
            date: new Date().toISOString().split('T')[0],
            targetOdds: `${challenge.dailyTargetOddsMin.toFixed(2)} - ${challenge.dailyTargetOddsMax.toFixed(2)}`,
            status: 'READY',
            stake: updatedBankroll,
          });
        }
      }
    } else if (ticketSettlement.newStatus === 'LOST') {
      dayStatus = 'LOST';
      actualReturn = 0;
      profitOrLoss = -stake;
      updatedBankroll = Math.max(0, challenge.currentBankroll - stake);
      newChallengeStatus = 'FAILED';
      message = `Rollover Day ${targetDayNumber} LOST. Challenge concluded.`;
    } else if (ticketSettlement.newStatus === 'VOID') {
      dayStatus = 'VOID';
      actualReturn = stake; // stake refunded
      profitOrLoss = 0;
      // Bankroll unchanged
      message = `Rollover Day ${targetDayNumber} VOID. Stake refunded to bankroll. Day remains active for replay.`;
    }

    const settledDay: DailyRolloverDay = {
      ...currentDayEntry,
      status: dayStatus,
      stake,
      actualReturn,
      profitOrLoss,
      resolvedAt: new Date().toISOString(),
      notes: `${ticketSettlement.summaryMessage} Settled at odds ${ticketSettlement.settledOdds.toFixed(2)}x.`,
    };

    updatedDays[targetDayIndex] = settledDay;

    const updatedChallenge: DailyRolloverChallenge = {
      ...challenge,
      currentBankroll: updatedBankroll,
      currentDay: nextDayNumber,
      status: newChallengeStatus,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    };

    return {
      challenge: updatedChallenge,
      settledDay,
      ticketSettlement,
      advancedToDay: nextDayNumber,
      isChallengeComplete: newChallengeStatus === 'COMPLETED',
      isChallengeFailed: newChallengeStatus === 'FAILED',
      isDuplicateCallPrevented: false,
      message,
    };
  }
}

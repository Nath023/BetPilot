import { Selection, NormalizedMatchResult } from '../../shared/types/index.ts';
import { TeamAliasResolver } from '../providers/teamAliasResolver.ts';

export interface SelectionSettlementEvaluation {
  status: 'WON' | 'LOST' | 'VOID' | 'PENDING';
  reason: string;
  resultScore?: { home: number; away: number };
  settledAt?: string;
}

/**
 * MarketSettler: Evaluates individual bet selections against verified match results.
 * Strictly adheres to deterministic sports market settlement rules.
 * Never guesses or forces outcomes when match data is absent or incomplete.
 */
export class MarketSettler {
  public static evaluateSelection(
    selection: Selection,
    result?: NormalizedMatchResult | null
  ): SelectionSettlementEvaluation {
    // 1. Missing result -> keep PENDING
    if (!result) {
      return {
        status: 'PENDING',
        reason: 'Match result not yet verified by sports provider.',
      };
    }

    // 2. Fixture not yet finished
    if (result.status === 'SCHEDULED' || result.status === 'LIVE') {
      return {
        status: 'PENDING',
        reason: `Match is currently ${result.status.toLowerCase()}. Awaiting official full-time confirmation.`,
      };
    }

    // 3. Postponed, cancelled, or abandoned matches
    if (
      result.status === 'POSTPONED' ||
      result.status === 'CANCELLED' ||
      result.status === 'ABANDONED'
    ) {
      return {
        status: 'VOID',
        reason: `Fixture was ${result.status.toLowerCase()}. Selection settled as VOID (odds 1.00).`,
        settledAt: new Date().toISOString(),
      };
    }

    // 4. Missing score data on a finished match -> cannot settle safely
    if (
      result.score.home === null ||
      result.score.away === null ||
      isNaN(result.score.home) ||
      isNaN(result.score.away)
    ) {
      return {
        status: 'PENDING',
        reason: 'Match finished but score line is missing or ambiguous. Holding settlement.',
      };
    }

    const homeGoals = result.score.home;
    const awayGoals = result.score.away;
    const totalGoals = homeGoals + awayGoals;
    const scoreSummary = { home: homeGoals, away: awayGoals };
    const settledAt = new Date().toISOString();

    const marketNorm = selection.market.toLowerCase().trim();
    const selNorm = selection.selection.toLowerCase().trim();
    const homeTeam = selection.homeTeam;
    const awayTeam = selection.awayTeam;

    // --- MARKET: 1X2 / Match Winner ---
    if (
      marketNorm.includes('1x2') ||
      marketNorm.includes('match winner') ||
      marketNorm.includes('full time result') ||
      marketNorm === 'winner'
    ) {
      const isHomePick =
        selNorm === '1' ||
        selNorm.includes('home') ||
        TeamAliasResolver.matches(selNorm, homeTeam) ||
        selNorm.includes(homeTeam.toLowerCase());
      const isAwayPick =
        selNorm === '2' ||
        selNorm.includes('away') ||
        TeamAliasResolver.matches(selNorm, awayTeam) ||
        selNorm.includes(awayTeam.toLowerCase());
      const isDrawPick =
        selNorm === 'x' ||
        selNorm.includes('draw') ||
        selNorm.includes('tie');

      if (isHomePick) {
        return homeGoals > awayGoals
          ? { status: 'WON', reason: `Home win: ${homeGoals}-${awayGoals}`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Home failed to win: ${homeGoals}-${awayGoals}`, resultScore: scoreSummary, settledAt };
      }

      if (isAwayPick) {
        return awayGoals > homeGoals
          ? { status: 'WON', reason: `Away win: ${homeGoals}-${awayGoals}`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Away failed to win: ${homeGoals}-${awayGoals}`, resultScore: scoreSummary, settledAt };
      }

      if (isDrawPick) {
        return homeGoals === awayGoals
          ? { status: 'WON', reason: `Match drawn: ${homeGoals}-${awayGoals}`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Match ended with a winner: ${homeGoals}-${awayGoals}`, resultScore: scoreSummary, settledAt };
      }
    }

    // --- MARKET: Double Chance ---
    if (marketNorm.includes('double chance') || marketNorm.includes('chance')) {
      const is1X =
        selNorm.includes('1x') ||
        selNorm.includes('home or draw') ||
        selNorm.includes('or draw') && (selNorm.includes(homeTeam.toLowerCase()) || TeamAliasResolver.matches(selNorm, homeTeam));
      const isX2 =
        selNorm.includes('x2') ||
        selNorm.includes('draw or away') ||
        selNorm.includes('draw or') && (selNorm.includes(awayTeam.toLowerCase()) || TeamAliasResolver.matches(selNorm, awayTeam));
      const is12 =
        selNorm.includes('12') ||
        selNorm.includes('1 or 2') ||
        selNorm.includes('home or away') ||
        selNorm.includes('any team win');

      if (is1X) {
        return homeGoals >= awayGoals
          ? { status: 'WON', reason: `Home win or draw covered: ${homeGoals}-${awayGoals}`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Away team won: ${homeGoals}-${awayGoals}`, resultScore: scoreSummary, settledAt };
      }

      if (isX2) {
        return awayGoals >= homeGoals
          ? { status: 'WON', reason: `Draw or away win covered: ${homeGoals}-${awayGoals}`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Home team won: ${homeGoals}-${awayGoals}`, resultScore: scoreSummary, settledAt };
      }

      if (is12) {
        return homeGoals !== awayGoals
          ? { status: 'WON', reason: `Decisive winner emerged: ${homeGoals}-${awayGoals}`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Match ended in a draw: ${homeGoals}-${awayGoals}`, resultScore: scoreSummary, settledAt };
      }
    }

    // --- MARKET: Over / Under Goals ---
    if (marketNorm.includes('over') || marketNorm.includes('under') || marketNorm.includes('goals')) {
      // Over 1.5
      if (selNorm.includes('over 1.5')) {
        return totalGoals > 1.5
          ? { status: 'WON', reason: `Total goals ${totalGoals} > 1.5 (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Total goals ${totalGoals} <= 1.5 (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt };
      }
      // Under 1.5
      if (selNorm.includes('under 1.5')) {
        return totalGoals < 1.5
          ? { status: 'WON', reason: `Total goals ${totalGoals} < 1.5 (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Total goals ${totalGoals} >= 1.5 (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt };
      }

      // Over 2.5
      if (selNorm.includes('over 2.5')) {
        return totalGoals > 2.5
          ? { status: 'WON', reason: `Total goals ${totalGoals} > 2.5 (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Total goals ${totalGoals} <= 2.5 (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt };
      }
      // Under 2.5
      if (selNorm.includes('under 2.5')) {
        return totalGoals < 2.5
          ? { status: 'WON', reason: `Total goals ${totalGoals} < 2.5 (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Total goals ${totalGoals} >= 2.5 (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt };
      }

      // Over 0.5
      if (selNorm.includes('over 0.5')) {
        return totalGoals >= 1
          ? { status: 'WON', reason: `Total goals ${totalGoals} > 0.5 (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Goalless draw 0-0`, resultScore: scoreSummary, settledAt };
      }
      // Under 0.5
      if (selNorm.includes('under 0.5')) {
        return totalGoals === 0
          ? { status: 'WON', reason: `Total goals 0 <= 0.5 (0-0)`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Goals scored: ${homeGoals}-${awayGoals}`, resultScore: scoreSummary, settledAt };
      }

      // Over 3.5
      if (selNorm.includes('over 3.5')) {
        return totalGoals > 3.5
          ? { status: 'WON', reason: `Total goals ${totalGoals} > 3.5 (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Total goals ${totalGoals} <= 3.5 (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt };
      }
      // Under 3.5
      if (selNorm.includes('under 3.5')) {
        return totalGoals < 3.5
          ? { status: 'WON', reason: `Total goals ${totalGoals} < 3.5 (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Total goals ${totalGoals} >= 3.5 (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt };
      }
    }

    // --- MARKET: Both Teams to Score (BTTS) ---
    if (
      marketNorm.includes('both teams to score') ||
      marketNorm.includes('btts') ||
      marketNorm.includes('gg/ng')
    ) {
      const isYes = selNorm === 'yes' || selNorm.includes('btts yes') || selNorm === 'gg';
      const isNo = selNorm === 'no' || selNorm.includes('btts no') || selNorm === 'ng';

      const bttsHappened = homeGoals > 0 && awayGoals > 0;

      if (isYes) {
        return bttsHappened
          ? { status: 'WON', reason: `Both teams scored (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `At least one team failed to score (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt };
      }

      if (isNo) {
        return !bttsHappened
          ? { status: 'WON', reason: `Clean sheet or goalless (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Both teams scored (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt };
      }
    }

    // --- MARKET: Draw No Bet (DNB) ---
    if (marketNorm.includes('draw no bet') || marketNorm.includes('dnb')) {
      const isHome =
        selNorm === '1' ||
        selNorm.includes('home') ||
        selNorm.includes(homeTeam.toLowerCase()) ||
        TeamAliasResolver.matches(selNorm, homeTeam);
      const isAway =
        selNorm === '2' ||
        selNorm.includes('away') ||
        selNorm.includes(awayTeam.toLowerCase()) ||
        TeamAliasResolver.matches(selNorm, awayTeam);

      if (homeGoals === awayGoals) {
        return {
          status: 'VOID',
          reason: `Match tied (${homeGoals}-${awayGoals}). Draw No Bet stake returned / VOID.`,
          resultScore: scoreSummary,
          settledAt,
        };
      }

      if (isHome) {
        return homeGoals > awayGoals
          ? { status: 'WON', reason: `Home win (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Away win (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt };
      }

      if (isAway) {
        return awayGoals > homeGoals
          ? { status: 'WON', reason: `Away win (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt }
          : { status: 'LOST', reason: `Home win (${homeGoals}-${awayGoals})`, resultScore: scoreSummary, settledAt };
      }
    }

    // Default fallback: do not guess unhandled custom or ambiguous markets
    return {
      status: 'PENDING',
      reason: `Market "${selection.market}" (${selection.selection}) requires manual verification or custom rule definition.`,
    };
  }
}

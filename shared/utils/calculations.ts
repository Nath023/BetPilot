import { Selection, TicketCalculation, RolloverTracker } from '../types/index.ts';

/**
 * Calculates decimal combined odds for a list of selections.
 * Combined odds = product of all selection odds.
 * Returns 1.0 if empty list.
 */
export function calculateCombinedOdds(oddsList: number[]): number {
  if (!oddsList || oddsList.length === 0) return 1.0;
  const rawProduct = oddsList.reduce((acc, curr) => {
    const validOdds = isNaN(curr) || curr <= 0 ? 1.0 : curr;
    return acc * validOdds;
  }, 1.0);
  // Round to 2 decimal places for betting display while preserving precision
  return Math.round(rawProduct * 100) / 100;
}

/**
 * Calculates potential payout and profit for decimal odds.
 * potentialReturn = stake * combinedOdds
 * profit = potentialReturn - stake
 */
export function calculatePayout(stake: number, combinedOdds: number) {
  const safeStake = Math.max(0, isNaN(stake) ? 0 : stake);
  const safeOdds = Math.max(1, isNaN(combinedOdds) ? 1 : combinedOdds);
  const potentialReturn = Math.round(safeStake * safeOdds * 100) / 100;
  const profit = Math.round((potentialReturn - safeStake) * 100) / 100;
  return { potentialReturn, profit };
}

/**
 * Calculates implied probability from decimal odds.
 * impliedProbability = 1 / decimalOdds
 * Note: Does not claim to be true outcome probability!
 */
export function calculateImpliedProbability(decimalOdds: number): number {
  if (isNaN(decimalOdds) || decimalOdds <= 1.0) return 0;
  const raw = 1 / decimalOdds;
  return Math.min(1, Math.max(0, Math.round(raw * 10000) / 10000));
}

/**
 * Calculates Expected Value (EV) per unit stake:
 * EV = (estimatedProbability * odds) - 1
 */
export function calculateExpectedValue(decimalOdds: number, estimatedProbability: number, stake: number = 100) {
  const impliedProb = calculateImpliedProbability(decimalOdds);
  const safeEstProb = Math.min(1, Math.max(0, estimatedProbability));
  const evPerUnit = (safeEstProb * decimalOdds) - 1;
  const evAmount = Math.round(evPerUnit * stake * 100) / 100;
  const edge = Math.round((safeEstProb - impliedProb) * 10000) / 100; // in percentage points

  return {
    impliedProbability: impliedProb,
    estimatedProbability: safeEstProb,
    expectedValuePerUnit: Math.round(evPerUnit * 10000) / 10000,
    expectedValueAmount: evAmount,
    edgePercentage: edge,
    assumptions: [
      'Assumes estimated probability is an accurate model representation',
      'Assumes decimal odds payout is executed with 0 bookmaker void rate',
      'Does not account for cash-out deductions or tax withholding',
    ],
    limitations: [
      'Model estimates are inherently statistical approximations, never certain outcomes',
      'Bookmaker margins are built into posted decimal odds',
    ],
  };
}

/**
 * Calculates comprehensive metrics for a ticket
 */
export function calculateTicketMetrics(selections: Selection[], stake: number = 1000): TicketCalculation {
  const oddsList = selections.map((s) => s.odds);
  const combinedOdds = calculateCombinedOdds(oddsList);
  const { potentialReturn, profit } = calculatePayout(stake, combinedOdds);
  const impliedProbability = calculateImpliedProbability(combinedOdds);

  const warnings: string[] = [];
  selections.forEach((sel, idx) => {
    if (sel.odds < 1.05) {
      warnings.push(`Selection ${idx + 1} (${sel.homeTeam} vs ${sel.awayTeam}) has ultra-low odds (${sel.odds}). Check if minimum qualification odds apply.`);
    }
    if (sel.confidence < 0.6) {
      warnings.push(`Selection ${idx + 1} (${sel.homeTeam} vs ${sel.awayTeam}) was extracted with low confidence (${Math.round(sel.confidence * 100)}%). Please verify.`);
    }
  });

  return {
    selectionCount: selections.length,
    combinedOdds,
    impliedProbability,
    stake,
    potentialReturn,
    profit,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Calculates bonus rollover requirements and progress
 */
export function calculateRolloverProgress(
  bonusAmount: number,
  rolloverMultiplier: number,
  completedWager: number
) {
  const safeBonus = Math.max(0, bonusAmount);
  const safeMultiplier = Math.max(1, rolloverMultiplier);
  const safeCompleted = Math.max(0, completedWager);

  const requiredWager = Math.round(safeBonus * safeMultiplier * 100) / 100;
  const remainingWager = Math.max(0, Math.round((requiredWager - safeCompleted) * 100) / 100);
  const progressPercentage = requiredWager > 0
    ? Math.min(100, Math.max(0, Math.round((safeCompleted / requiredWager) * 100)))
    : 0;

  return {
    requiredWager,
    completedWager: safeCompleted,
    remainingWager,
    progressPercentage,
    isCompleted: remainingWager === 0,
  };
}

/**
 * Calculates market overround (bookmaker margin percentage) from a set of mutually exclusive outcomes.
 * Overround % = (Sum(1 / odds_i) - 1) * 100
 * e.g. 1X2 market: Home @ 2.0 (50%), Draw @ 3.4 (29.4%), Away @ 3.8 (26.3%) => sum = 105.7% => overround = 5.7%
 */
export function calculateMarketOverround(marketOdds: number[]): {
  totalImpliedPercent: number;
  marginPercent: number;
  isFairOrValue: boolean;
} {
  if (!marketOdds || marketOdds.length === 0) {
    return { totalImpliedPercent: 100, marginPercent: 0, isFairOrValue: true };
  }
  const sum = marketOdds.reduce((acc, odd) => {
    return acc + (odd > 1 ? 1 / odd : 0);
  }, 0);
  const totalImpliedPercent = Math.round(sum * 1000) / 10;
  const marginPercent = Math.round((sum - 1) * 1000) / 10;
  return {
    totalImpliedPercent,
    marginPercent: Math.max(0, marginPercent),
    isFairOrValue: marginPercent <= 3.0,
  };
}

/**
 * Generates combinations for ticket splitting (e.g. singles, doubles, trebles)
 */
export function generateCombinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length === 0 || k > items.length) return [];
  const head = items[0];
  const tail = items.slice(1);
  const withHead = generateCombinations(tail, k - 1).map((combo) => [head, ...combo]);
  const withoutHead = generateCombinations(tail, k);
  return [...withHead, ...withoutHead];
}

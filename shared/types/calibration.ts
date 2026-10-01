import { Selection, Ticket, ConfidenceLevel } from './index.ts';

export interface CalibrationBucket {
  bucket: string; // e.g. "50-59%", "60-69%", "70-79%", "80-89%", "90%+"
  minProbability: number; // e.g. 0.50
  maxProbability: number; // e.g. 0.599
  count: number;
  wonCount: number;
  lostCount: number;
  meanPredictedProbability: number; // 0.0 to 1.0 (e.g. 0.64)
  observedWinRate: number; // 0.0 to 100.0 (e.g. 66.7%)
  difference: number; // observedWinRate - (meanPredictedProbability * 100)
  calibrationError: number; // abs(meanPredictedProbability - observedWinRate / 100)
}

export interface MarketPerformanceMetric {
  market: string;
  totalSelections: number;
  wonSelections: number;
  lostSelections: number;
  voidSelections: number;
  winRate: number; // %
  totalStakes: number;
  totalReturns: number;
  netProfit: number;
  roi: number; // %
  avgOdds: number;
}

export interface ConfidenceBandMetric {
  band: string; // "<60%", "60-69%", "70-79%", "80-89%", "90%+"
  confidenceLevel?: ConfidenceLevel;
  totalSelections: number;
  wonSelections: number;
  lostSelections: number;
  winRate: number; // %
  avgOdds: number;
  brierScore: number;
  roi: number; // %
}

export interface SportPerformanceMetric {
  sport: string;
  totalSelections: number;
  wonSelections: number;
  lostSelections: number;
  winRate: number; // %
  totalStakes: number;
  totalReturns: number;
  roi: number; // %
}

export interface TimeSeriesPoint {
  date: string; // "YYYY-MM-DD"
  timestamp: string;
  settledCount: number;
  wonCount: number;
  winRate: number; // %
  cumulativeWinRate: number; // %
  stakes: number;
  returns: number;
  profit: number;
  cumulativeProfit: number;
  cumulativeRoi: number; // %
}

export interface BettingFormatMetrics {
  singlesCount: number;
  singlesWon: number;
  singlesWinRate: number;
  singlesRoi: number;
  accumulatorsCount: number;
  accumulatorsWon: number;
  accumulatorsWinRate: number;
  accumulatorsRoi: number;
  avgAccumulatorLegs: number;
  avgWinningOdds: number;
  avgLosingOdds: number;
  voidLegCount: number;
  voidLegFrequency: number; // % of total legs
}

export interface AccuracySummaryMetrics {
  totalSettledSelections: number;
  correctSelections: number;
  incorrectSelections: number;
  voidSelections: number;
  pendingSelections: number;
  winRate: number; // % (WON / (WON + LOST))
  brierScore: number; // 0.0 to 1.0 (lower is better)
  brierRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  expectedCalibrationError: number; // Weighted average difference
}

export interface FinancialSummaryMetrics {
  totalSettledTickets: number;
  winningTickets: number;
  losingTickets: number;
  voidTickets: number;
  totalStakes: number;
  totalReturns: number;
  netProfit: number;
  roi: number; // %
  avgTicketOdds: number;
  avgSelectionOdds: number;
  profitFactor: number; // totalReturns / totalStakes (or gross profit / gross loss)
}

export interface CalibrationDashboardFilter {
  dateRange: 'all' | '7d' | '30d' | '90d';
  sport: 'all' | 'football' | 'basketball' | 'tennis';
  market: 'all' | '1x2' | 'over_under' | 'btts' | 'double_chance' | 'dnb';
  startDate?: string;
  endDate?: string;
}

export interface SettledPredictionRecord {
  id: string;
  ticketId?: string;
  fixture: string;
  competition?: string;
  sport: string;
  market: string;
  selection: string;
  odds: number;
  modelEstimatedProbability: number;
  confidence: number;
  outcome: 'WON' | 'LOST' | 'VOID';
  score?: { home: number; away: number };
  settledAt: string;
  stake?: number;
  actualReturn?: number;
  details?: string;
}

export interface CalibrationDashboardData {
  filter: CalibrationDashboardFilter;
  accuracy: AccuracySummaryMetrics;
  financial: FinancialSummaryMetrics;
  bettingFormats: BettingFormatMetrics;
  calibrationBuckets: CalibrationBucket[];
  marketsPerformance: MarketPerformanceMetric[];
  confidenceBands: ConfidenceBandMetric[];
  sportsPerformance: SportPerformanceMetric[];
  timeSeries: TimeSeriesPoint[];
  recentSettledPredictions: SettledPredictionRecord[];
}

// Core domain types for BetPilot AI

export type VerificationStatus =
  | 'VERIFIED'
  | 'USER_PROVIDED'
  | 'CALCULATED'
  | 'AI_ESTIMATE'
  | 'UNAVAILABLE';

export type ActionStatus =
  | 'PROPOSED'
  | 'CONFIRMATION_REQUIRED'
  | 'CONFIRMED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type TicketStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'SAVED'
  | 'ALTERNATIVE'
  | 'TRIMMED'
  | 'SPLIT'
  | 'ARCHIVED';

export type Currency = 'NGN' | 'USD' | 'GBP' | 'EUR';

export interface UserPreferences {
  currency: Currency;
  defaultBookmaker: string;
  maxStakeLimit?: number;
  sessionTimeLimitMinutes?: number;
  enableEvWarnings: boolean;
  responsibleGamblingMode: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  preferences: UserPreferences;
}

export interface Selection {
  id: string;
  fixtureId?: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTime?: string;
  competition?: string;
  market: string;
  selection: string;
  odds: number;
  confidence: number; // 0.0 to 1.0
  source: VerificationStatus;
  status?: 'PENDING' | 'WON' | 'LOST' | 'VOID';
  uncertainFields?: string[];
  notes?: string;
}

export interface Ticket {
  id: string;
  userId?: string;
  title?: string;
  bookmaker: string;
  bookingCode?: string;
  status: TicketStatus;
  selections: Selection[];
  totalOdds: number;
  stake: number;
  potentialReturn: number;
  potentialProfit: number;
  impliedProbability: number; // 0 to 1
  source: VerificationStatus;
  extractionConfidence?: number;
  extractionWarnings?: string[];
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface TicketCalculation {
  selectionCount: number;
  combinedOdds: number;
  impliedProbability: number;
  stake: number;
  potentialReturn: number;
  profit: number;
  warnings?: string[];
}

export interface FixtureStatistics {
  label: string;
  homeValue: string | number;
  awayValue: string | number;
}

// ============================================
// NORMALIZED SPORTS DATA & MARKET ODDS INTERFACES
// ============================================

export type ProviderMode = 'DEMO' | 'LIVE';
export type FixtureStatus = 'SCHEDULED' | 'TIMED' | 'LIVE' | 'FINISHED' | 'POSTPONED';

export interface NormalizedFixture {
  id: string;
  externalId: string;
  provider: string;
  homeTeam: {
    id: string;
    name: string;
    shortName?: string;
    logo?: string;
  };
  awayTeam: {
    id: string;
    name: string;
    shortName?: string;
    logo?: string;
  };
  competition: {
    id: string;
    name: string;
    country?: string;
  };
  kickoffTime: string;
  status: FixtureStatus;
  venue?: {
    name: string;
    city: string;
  };
}

export interface NormalizedTeamStats {
  averageGoalsScored: number | 'UNAVAILABLE';
  averageGoalsConceded: number | 'UNAVAILABLE';
  bttsFrequency: number | 'UNAVAILABLE'; // 0.0 to 1.0 frequency
  over15Frequency: number | 'UNAVAILABLE'; // 0.0 to 1.0 frequency
  over25Frequency: number | 'UNAVAILABLE'; // 0.0 to 1.0 frequency
  cleanSheetCount: number | 'UNAVAILABLE';
  formLast5: ('W' | 'D' | 'L')[] | 'UNAVAILABLE';
  leagueRank?: number | 'UNAVAILABLE';
  isFallbackDemoValue?: boolean;
}

export interface NormalizedH2H {
  homeWins: number;
  draws: number;
  awayWins: number;
  totalMatches: number;
  lastMatches: Array<{
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
  }>;
}

export interface NormalizedMarketOdds {
  fixtureId: string;
  bookmaker: string;
  market: string; // e.g. '1X2', 'Over/Under Goals', 'Double Chance', 'Both Teams to Score'
  selection: string; // e.g. 'Over 1.5 Goals', 'Arsenal Win', 'Home or Draw (1X)'
  odds: number;
  lastUpdated: string;
  available: boolean;
}

export interface NormalizedFixtureResearch {
  fixture: NormalizedFixture;
  homeStats: NormalizedTeamStats;
  awayStats: NormalizedTeamStats;
  h2h: NormalizedH2H;
  standings?: {
    homeRank: number | 'UNAVAILABLE';
    awayRank: number | 'UNAVAILABLE';
    homePoints?: number | 'UNAVAILABLE';
    awayPoints?: number | 'UNAVAILABLE';
  };
  injuries?: Array<{ team: 'home' | 'away'; player: string; status: string }> | 'UNAVAILABLE';
  lineups?: {
    homeConfirmed: boolean;
    awayConfirmed: boolean;
    players?: string[];
  } | 'UNAVAILABLE';
  marketOdds: NormalizedMarketOdds[];
  dataSources: string[];
  dataFreshness: string;
  sourceStatus: VerificationStatus | 'DEMO';
  observations: string[];
  limitations: string[];
  retrievedAt: string;
}

export interface ResearchResult {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoffTime?: string;
  dataSources: string[];
  dataFreshness: string;
  homeForm: ('W' | 'D' | 'L')[];
  awayForm: ('W' | 'D' | 'L')[];
  headToHead: {
    homeWins: number;
    draws: number;
    awayWins: number;
    lastMatches: {
      date: string;
      homeScore: number;
      awayScore: number;
      homeTeam: string;
      awayTeam: string;
    }[];
  };
  statistics: FixtureStatistics[];
  standings?: {
    homeRank: number;
    awayRank: number;
    homePoints: number;
    awayPoints: number;
  };
  injuries?: {
    team: 'home' | 'away';
    player: string;
    status: string;
  }[];
  observations: string[];
  limitations: string[];
  retrievedAt: string;
  sourceStatus: VerificationStatus;
}

export interface SelectionAnalysis {
  selectionId: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  selection: string;
  odds: number;
  impliedProbability: number;
  estimatedProbability?: number;
  estimatedProbabilitySource?: string;
  expectedValue?: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  assumptions: string[];
  limitations: string[];
}

export interface TicketAnalysis {
  ticketId: string;
  highestRiskSelections: Selection[];
  highestImpliedProbabilitySelections: Selection[];
  overallAssessment: string;
  selectionAnalyses: SelectionAnalysis[];
  dataQualitySummary: {
    verifiedCount: number;
    userProvidedCount: number;
    needsConfirmationCount: number;
  };
  suggestedActions: string[];
}

export interface RolloverTracker {
  id: string;
  userId?: string;
  bookmaker: string;
  bonusAmount: number;
  currency: Currency;
  rolloverMultiplier: number;
  requiredWager: number;
  completedWager: number;
  remainingWager: number;
  progressPercentage: number;
  minOddsPerTicket?: number;
  minSelectionsPerTicket?: number;
  qualifyingRules: string[];
  startDate: string;
  expiryDate?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  updatedAt: string;
}

export interface ProposedAction {
  id: string;
  type:
    | 'TRIM_TICKET'
    | 'SPLIT_TICKET'
    | 'CONVERT_TICKET'
    | 'DELETE_TICKET'
    | 'SAVE_TICKET'
    | 'UPDATE_ROLLOVER'
    | 'CREATE_ALTERNATIVE';
  title: string;
  description: string;
  requiresConfirmation: boolean;
  status: ActionStatus;
  beforeSummary?: Record<string, any>;
  afterSummary?: Record<string, any>;
  payload?: any;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: {
    id: string;
    type: 'image';
    url: string;
    filename: string;
  }[];
  extractedTicket?: Ticket;
  proposedAction?: ProposedAction;
  toolResults?: {
    toolName: string;
    success: boolean;
    data: any;
    summary?: string;
  }[];
  dataStatus?: VerificationStatus;
  warnings?: string[];
  suggestedPrompts?: string[];
}

export interface BookmakerCapability {
  id: string;
  name: string;
  country: string;
  logoColor: string;
  currency: Currency;
  supportedMarkets: string[];
  supportsCodeParsing: boolean;
  supportsCodeGeneration: boolean;
  supportsValidation: boolean;
  supportsConversion: boolean;
  integrationStatus: 'connected' | 'not_configured' | 'demo_only';
  bookingCodePattern?: string;
  notes?: string;
}

// ============================================
// STAGE 2: PREDICTION & DAILY ROLLOVER TYPES
// ============================================

export type DataQualityLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export interface CandidateSelection {
  id: string;
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoffTime: string;
  market: string;
  selection: string;
  bookmakerOdds: number;
  impliedProbability: number; // 1 / odds
  modelEstimatedProbability: number; // e.g. 0.78
  edgePercentage: number; // (modelEst - implied) * 100
  expectedValue: number; // (modelEst * odds) - 1
  confidence: ConfidenceLevel;
  dataQuality: DataQualityLevel;
  dataQualityInputs: string[];
  dataQualityMissing: string[];
  whySelected: string[];
  limitations: string[];
  correlatedKeys: string[];
}

export interface CandidateSlip {
  id: string;
  title: string;
  targetOddsRange: string;
  combinedOdds: number;
  impliedProbability: number;
  selections: CandidateSelection[];
  dataQuality: DataQualityLevel;
  averageConfidence: ConfidenceLevel;
  correlationWarnings: string[];
  rationale: string;
}

export interface OptimizerStrategyOptions {
  preferredMarkets?: string[];
  excludedMarkets?: string[];
  minConfidence?: ConfidenceLevel;
  minDataQuality?: DataQualityLevel;
  maxPerLeague?: number;
  dateFilter?: string;
}

export interface GenerateCandidateSlipsOptions {
  targetOddsMin?: number;
  targetOddsMax?: number;
  selectionCountMin?: number;
  selectionCountMax?: number;
  riskPreference?: 'conservative' | 'balanced' | 'higher_variance';
  candidatePool?: CandidateSelection[];
  strategy?: OptimizerStrategyOptions;
  naturalLanguageInstruction?: string;
}

export type RolloverDayStatus = 'PENDING' | 'READY' | 'WON' | 'LOST' | 'VOID' | 'SKIPPED';

export interface DailyRolloverDay {
  dayNumber: number;
  date: string;
  targetOdds: string;
  status: RolloverDayStatus;
  selectedSlip?: CandidateSlip;
  stake?: number;
  potentialReturn?: number;
  actualReturn?: number;
  profitOrLoss?: number;
  notes?: string;
  resolvedAt?: string;
}

export interface DailyRolloverChallenge {
  id: string;
  title: string;
  startingBankroll: number;
  currentBankroll: number;
  targetMultiplier: number; // e.g. 10x
  targetAmount: number; // e.g. 100,000
  currency: Currency;
  dailyTargetOddsMin: number; // e.g. 4.00
  dailyTargetOddsMax: number; // e.g. 5.00
  totalDays: number; // e.g. 10
  currentDay: number; // e.g. 1
  days: DailyRolloverDay[];
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface PredictionSnapshot {
  id: string;
  fixtureId: string;
  fixture: string;
  competition: string;
  market: string;
  selection: string;
  odds: number;
  modelEstimatedProbability: number;
  confidence: ConfidenceLevel;
  dataQuality: DataQualityLevel;
  edgePercentage: number;
  timestamp: string;
  actualResult?: 'WON' | 'LOST' | 'VOID' | 'PENDING';
}

export interface UrlAnalysisResult {
  url: string;
  sourceType: 'twitter_x' | 'sports_website' | 'match_fixture' | 'bookmaker' | 'unknown';
  sourceClaims: string[];
  extractedFixtures: {
    homeTeam: string;
    awayTeam: string;
    market?: string;
    selection?: string;
    odds?: number;
  }[];
  betPilotAnalysis: string;
  retrievedAt: string;
  limitations: string[];
}


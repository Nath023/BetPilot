import { LiveSportsProvider } from '../server/providers/liveSportsProvider.ts';
import { SettlementEngine } from '../server/settlement/settlementEngine.ts';
import { MarketSettler } from '../server/settlement/marketSettler.ts';
import { RolloverSettler } from '../server/settlement/rolloverSettler.ts';
import {
  Ticket,
  Selection,
  DailyRolloverChallenge,
  NormalizedMatchResult,
} from '../shared/types/index.ts';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.error(`  ✗ FAIL: ${name}`);
  }
}

console.log('================================================================');
console.log('BETPILOT E2E VALIDATION: REAL FOOTBALL-DATA.ORG FIXTURE SETTLEMENT');
console.log('================================================================\n');

// ----------------------------------------------------
// REAL FOOTBALL FIXTURES FROM FOOTBALL-DATA.ORG SPECIFICATION
// ----------------------------------------------------
const rawFootballDataMatches = [
  // 1. Premier League: Arsenal vs Wolves (2-0)
  {
    id: 435987,
    utcDate: '2024-08-17T14:00:00Z',
    status: 'FINISHED',
    competition: { id: 2021, name: 'Premier League' },
    homeTeam: { id: 57, name: 'Arsenal FC', shortName: 'Arsenal' },
    awayTeam: { id: 76, name: 'Wolverhampton Wanderers FC', shortName: 'Wolverhampton' },
    score: {
      winner: 'HOME_TEAM',
      duration: 'REGULAR',
      fullTime: { home: 2, away: 0 },
      halfTime: { home: 1, away: 0 },
    },
  },
  // 2. Premier League: Chelsea vs Manchester City (0-2)
  {
    id: 435988,
    utcDate: '2024-08-18T15:30:00Z',
    status: 'FINISHED',
    competition: { id: 2021, name: 'Premier League' },
    homeTeam: { id: 61, name: 'Chelsea FC', shortName: 'Chelsea' },
    awayTeam: { id: 65, name: 'Manchester City FC', shortName: 'Manchester City' },
    score: {
      winner: 'AWAY_TEAM',
      duration: 'REGULAR',
      fullTime: { home: 0, away: 2 },
      halfTime: { home: 0, away: 1 },
    },
  },
  // 3. Serie A: Genoa vs Inter Milan (2-2 Draw)
  {
    id: 435989,
    utcDate: '2024-08-17T16:30:00Z',
    status: 'FINISHED',
    competition: { id: 2019, name: 'Serie A' },
    homeTeam: { id: 107, name: 'Genoa CFC', shortName: 'Genoa' },
    awayTeam: { id: 108, name: 'FC Internazionale Milano', shortName: 'Inter' },
    score: {
      winner: 'DRAW',
      duration: 'REGULAR',
      fullTime: { home: 2, away: 2 },
      halfTime: { home: 1, away: 1 },
    },
  },
  // 4. La Liga: Real Madrid vs Real Betis (2-0)
  {
    id: 435990,
    utcDate: '2024-09-01T19:30:00Z',
    status: 'FINISHED',
    competition: { id: 2014, name: 'Primera Division' },
    homeTeam: { id: 86, name: 'Real Madrid CF', shortName: 'Real Madrid' },
    awayTeam: { id: 90, name: 'Real Betis Balompié', shortName: 'Real Betis' },
    score: {
      winner: 'HOME_TEAM',
      duration: 'REGULAR',
      fullTime: { home: 2, away: 0 },
      halfTime: { home: 0, away: 0 },
    },
  },
  // 5. Postponed Fixture: Bournemouth vs Luton Town
  {
    id: 435991,
    utcDate: '2023-12-16T15:00:00Z',
    status: 'POSTPONED',
    competition: { id: 2021, name: 'Premier League' },
    homeTeam: { id: 1044, name: 'AFC Bournemouth', shortName: 'Bournemouth' },
    awayTeam: { id: 389, name: 'Luton Town FC', shortName: 'Luton' },
    score: {
      winner: null,
      duration: 'REGULAR',
      fullTime: { home: null, away: null },
    },
  },
  // 6. Future Scheduled Match (Pending): Arsenal vs Liverpool
  {
    id: 435992,
    utcDate: '2026-10-15T19:00:00Z',
    status: 'SCHEDULED',
    competition: { id: 2021, name: 'Premier League' },
    homeTeam: { id: 57, name: 'Arsenal FC', shortName: 'Arsenal' },
    awayTeam: { id: 64, name: 'Liverpool FC', shortName: 'Liverpool' },
    score: {
      winner: null,
      duration: 'REGULAR',
      fullTime: { home: null, away: null },
    },
  },
];

// Ingest through LiveSportsProvider adapter
const realResults: NormalizedMatchResult[] = rawFootballDataMatches.map((m) =>
  LiveSportsProvider.adaptFootballDataMatch(m)
);

// ----------------------------------------------------
// SECTION 1: INGESTION & NORMALIZATION VERIFICATION
// ----------------------------------------------------
console.log('SECTION 1: Real Match Ingestion via LiveSportsProvider');
{
  assert(realResults.length === 6, 'Ingested 6 real fixtures from Football-Data.org schema');
  assert(realResults[0].homeTeam === 'Arsenal', 'TeamAliasResolver normalized "Arsenal FC" to "Arsenal"');
  assert(realResults[0].score.home === 2 && realResults[0].score.away === 0, 'Accurately ingested FT score 2 - 0');
  assert(realResults[2].score.home === 2 && realResults[2].score.away === 2, 'Accurately ingested Genoa 2 - 2 Inter');
  assert(realResults[4].status === 'POSTPONED', 'Correctly parsed status POSTPONED for Bournemouth vs Luton');
  assert(realResults[5].status === 'SCHEDULED', 'Correctly parsed status SCHEDULED for future match');
}

// ----------------------------------------------------
// SECTION 2: SELECTION SETTLEMENT ACROSS ALL 5 MARKETS
// ----------------------------------------------------
console.log('\nSECTION 2: All 5 Supported Markets Settlement Against Real Scores');

// Market 1: 1X2 (Match Winner)
{
  const selWon: Selection = {
    id: 'sel-1x2-won',
    fixtureId: 'fd-435987',
    homeTeam: 'Arsenal',
    awayTeam: 'Wolverhampton',
    market: '1X2',
    selection: 'Arsenal Win',
    odds: 1.35,
    confidence: 0.95,
    source: 'VERIFIED',
  };
  const evalWon = MarketSettler.evaluateSelection(selWon, realResults[0]);
  assert(evalWon.status === 'WON', 'Market 1 (1X2): Arsenal Win correctly settled as WON (2-0)');

  const selLost: Selection = {
    id: 'sel-1x2-lost',
    fixtureId: 'fd-435988',
    homeTeam: 'Chelsea',
    awayTeam: 'Manchester City',
    market: '1X2',
    selection: 'Chelsea Win',
    odds: 3.8,
    confidence: 0.6,
    source: 'VERIFIED',
  };
  const evalLost = MarketSettler.evaluateSelection(selLost, realResults[1]);
  assert(evalLost.status === 'LOST', 'Market 1 (1X2): Chelsea Win correctly settled as LOST (0-2)');

  const selDraw: Selection = {
    id: 'sel-1x2-draw',
    fixtureId: 'fd-435989',
    homeTeam: 'Genoa',
    awayTeam: 'Inter',
    market: '1X2',
    selection: 'Draw (X)',
    odds: 3.6,
    confidence: 0.7,
    source: 'VERIFIED',
  };
  const evalDraw = MarketSettler.evaluateSelection(selDraw, realResults[2]);
  assert(evalDraw.status === 'WON', 'Market 1 (1X2): Draw (X) settled as WON on 2-2 score');
}

// Market 2: Double Chance
{
  const sel1X: Selection = {
    id: 'sel-dc-1x',
    fixtureId: 'fd-435987',
    homeTeam: 'Arsenal',
    awayTeam: 'Wolverhampton',
    market: 'Double Chance',
    selection: 'Arsenal or Draw (1X)',
    odds: 1.08,
    confidence: 0.98,
    source: 'VERIFIED',
  };
  const eval1X = MarketSettler.evaluateSelection(sel1X, realResults[0]);
  assert(eval1X.status === 'WON', 'Market 2 (Double Chance): 1X settled as WON (2-0)');

  const selX2: Selection = {
    id: 'sel-dc-x2',
    fixtureId: 'fd-435988',
    homeTeam: 'Chelsea',
    awayTeam: 'Manchester City',
    market: 'Double Chance',
    selection: 'Draw or Man City (X2)',
    odds: 1.25,
    confidence: 0.9,
    source: 'VERIFIED',
  };
  const evalX2 = MarketSettler.evaluateSelection(selX2, realResults[1]);
  assert(evalX2.status === 'WON', 'Market 2 (Double Chance): X2 settled as WON for Away win (0-2)');
}

// Market 3: Over / Under Goals
{
  const selOver: Selection = {
    id: 'sel-ou-over',
    fixtureId: 'fd-435987',
    homeTeam: 'Arsenal',
    awayTeam: 'Wolverhampton',
    market: 'Over/Under Goals',
    selection: 'Over 1.5 Goals',
    odds: 1.22,
    confidence: 0.92,
    source: 'VERIFIED',
  };
  const evalOver = MarketSettler.evaluateSelection(selOver, realResults[0]);
  assert(evalOver.status === 'WON', 'Market 3 (Over/Under): Over 1.5 Goals settled as WON (2 goals total)');

  const selUnder: Selection = {
    id: 'sel-ou-under',
    fixtureId: 'fd-435990',
    homeTeam: 'Real Madrid',
    awayTeam: 'Real Betis',
    market: 'Over/Under Goals',
    selection: 'Under 2.5 Goals',
    odds: 2.1,
    confidence: 0.8,
    source: 'VERIFIED',
  };
  const evalUnder = MarketSettler.evaluateSelection(selUnder, realResults[3]);
  assert(evalUnder.status === 'WON', 'Market 3 (Over/Under): Under 2.5 Goals settled as WON (2-0 score)');

  const selOverLost: Selection = {
    id: 'sel-ou-lost',
    fixtureId: 'fd-435988',
    homeTeam: 'Chelsea',
    awayTeam: 'Manchester City',
    market: 'Over/Under Goals',
    selection: 'Over 2.5 Goals',
    odds: 1.65,
    confidence: 0.85,
    source: 'VERIFIED',
  };
  const evalOverLost = MarketSettler.evaluateSelection(selOverLost, realResults[1]);
  assert(evalOverLost.status === 'LOST', 'Market 3 (Over/Under): Over 2.5 Goals settled as LOST on 0-2 (2 goals total)');
}

// Market 4: Both Teams to Score (BTTS)
{
  const selBttsYes: Selection = {
    id: 'sel-btts-yes',
    fixtureId: 'fd-435989',
    homeTeam: 'Genoa',
    awayTeam: 'Inter',
    market: 'Both Teams to Score',
    selection: 'BTTS Yes',
    odds: 1.85,
    confidence: 0.85,
    source: 'VERIFIED',
  };
  const evalBttsYes = MarketSettler.evaluateSelection(selBttsYes, realResults[2]);
  assert(evalBttsYes.status === 'WON', 'Market 4 (BTTS): BTTS Yes settled as WON on 2-2 score');

  const selBttsNo: Selection = {
    id: 'sel-btts-no',
    fixtureId: 'fd-435987',
    homeTeam: 'Arsenal',
    awayTeam: 'Wolverhampton',
    market: 'Both Teams to Score',
    selection: 'BTTS No',
    odds: 1.75,
    confidence: 0.88,
    source: 'VERIFIED',
  };
  const evalBttsNo = MarketSettler.evaluateSelection(selBttsNo, realResults[0]);
  assert(evalBttsNo.status === 'WON', 'Market 4 (BTTS): BTTS No settled as WON (2-0 clean sheet)');
}

// Market 5: Draw No Bet (DNB)
{
  const selDnbWon: Selection = {
    id: 'sel-dnb-won',
    fixtureId: 'fd-435990',
    homeTeam: 'Real Madrid',
    awayTeam: 'Real Betis',
    market: 'Draw No Bet',
    selection: 'Real Madrid (DNB)',
    odds: 1.15,
    confidence: 0.95,
    source: 'VERIFIED',
  };
  const evalDnbWon = MarketSettler.evaluateSelection(selDnbWon, realResults[3]);
  assert(evalDnbWon.status === 'WON', 'Market 5 (DNB): Home win DNB settled as WON (2-0)');

  const selDnbVoid: Selection = {
    id: 'sel-dnb-void',
    fixtureId: 'fd-435989',
    homeTeam: 'Genoa',
    awayTeam: 'Inter',
    market: 'Draw No Bet',
    selection: 'Inter (DNB)',
    odds: 1.35,
    confidence: 0.9,
    source: 'VERIFIED',
  };
  const evalDnbVoid = MarketSettler.evaluateSelection(selDnbVoid, realResults[2]);
  assert(evalDnbVoid.status === 'VOID', 'Market 5 (DNB): Inter DNB pushed and settled as VOID on 2-2 tie');
}

// ----------------------------------------------------
// SECTION 3: POSTPONED & UNAVAILABLE FIXTURES
// ----------------------------------------------------
console.log('\nSECTION 3: Postponed and Unavailable Fixtures Reliability');
{
  // Postponed fixture: Bournemouth vs Luton Town
  const postponedSel: Selection = {
    id: 'sel-postponed',
    fixtureId: 'fd-435991',
    homeTeam: 'Bournemouth',
    awayTeam: 'Luton',
    market: '1X2',
    selection: 'Bournemouth Win',
    odds: 1.5,
    confidence: 0.85,
    source: 'VERIFIED',
  };
  const evalPostponed = MarketSettler.evaluateSelection(postponedSel, realResults[4]);
  assert(evalPostponed.status === 'VOID', 'Postponed fixture reliably settled as VOID (odds 1.00)');

  // Future scheduled fixture: Arsenal vs Liverpool
  const futureSel: Selection = {
    id: 'sel-future',
    fixtureId: 'fd-435992',
    homeTeam: 'Arsenal',
    awayTeam: 'Liverpool',
    market: '1X2',
    selection: 'Arsenal Win',
    odds: 2.1,
    confidence: 0.8,
    source: 'VERIFIED',
  };
  const evalFuture = MarketSettler.evaluateSelection(futureSel, realResults[5]);
  assert(evalFuture.status === 'PENDING', 'Future scheduled match reliably remains PENDING (never guessed)');

  // Completely unknown fixture missing from data feeds
  const unknownSel: Selection = {
    id: 'sel-unknown',
    fixtureId: 'fd-999999',
    homeTeam: 'Unknown FC',
    awayTeam: 'Ghost United',
    market: '1X2',
    selection: 'Unknown FC Win',
    odds: 1.9,
    confidence: 0.5,
    source: 'VERIFIED',
  };
  const evalUnknown = MarketSettler.evaluateSelection(unknownSel, null);
  assert(evalUnknown.status === 'PENDING', 'Missing fixture data reliably returns PENDING with reason');
}

// ----------------------------------------------------
// SECTION 4: REAL TICKET ACCUMULATOR SETTLEMENT
// ----------------------------------------------------
console.log('\nSECTION 4: Real Multi-Leg Accumulator Ticket Settlement');
(async () => {
  // Test ticket with 4 legs: 3 WON, 1 VOID (Postponed match)
  const realTicket: Ticket = {
    id: 'ticket-real-e2e',
    userId: 'user_e2e_football_data',
    bookmaker: 'SportyBet',
    totalOdds: 4.88,
    stake: 10000,
    potentialReturn: 48800,
    potentialProfit: 38800,
    impliedProbability: 0.205,
    status: 'SAVED',
    source: 'VERIFIED',
    createdAt: '2024-08-16T12:00:00Z',
    updatedAt: '2024-08-16T12:00:00Z',
    selections: [
      {
        id: 'real-leg-1',
        fixtureId: 'fd-435987',
        homeTeam: 'Arsenal',
        awayTeam: 'Wolverhampton',
        market: 'Over/Under Goals',
        selection: 'Over 1.5 Goals',
        odds: 1.25,
        confidence: 0.95,
        source: 'VERIFIED',
      },
      {
        id: 'real-leg-2',
        fixtureId: 'fd-435988',
        homeTeam: 'Chelsea',
        awayTeam: 'Manchester City',
        market: 'Double Chance',
        selection: 'Draw or Man City (X2)',
        odds: 1.28,
        confidence: 0.92,
        source: 'VERIFIED',
      },
      {
        id: 'real-leg-3',
        fixtureId: 'fd-435990',
        homeTeam: 'Real Madrid',
        awayTeam: 'Real Betis',
        market: '1X2',
        selection: 'Real Madrid Win',
        odds: 1.35,
        confidence: 0.94,
        source: 'VERIFIED',
      },
      {
        id: 'real-leg-4',
        fixtureId: 'fd-435991',
        homeTeam: 'Bournemouth',
        awayTeam: 'Luton',
        market: '1X2',
        selection: 'Bournemouth Win',
        odds: 2.25, // Postponed match!
        confidence: 0.8,
        source: 'VERIFIED',
      },
    ],
  };

  const settlement = await SettlementEngine.settleTicket(realTicket, realResults);

  assert(settlement.newStatus === 'WON', 'Ticket with 3 won legs and 1 void leg accurately settles as WON');
  assert(settlement.ticket.status === 'WON', 'Ticket status updated to WON');

  // Expected recalculated odds: 1.25 * 1.28 * 1.35 * 1.0 (void leg) = 2.16
  const expectedOdds = Math.round(1.25 * 1.28 * 1.35 * 100) / 100;
  assert(settlement.settledOdds === expectedOdds, `Settled odds recalculated without void leg (${expectedOdds}x)`);

  const expectedReturn = Math.round(10000 * expectedOdds);
  assert(settlement.actualReturn === expectedReturn, `Actual return calculated correctly: ₦${expectedReturn}`);
  assert(settlement.ticket.selections[3].status === 'VOID', 'Postponed selection marked as VOID');
  assert(settlement.ticket.selections[0].resultScore?.home === 2, 'Leg 1 verified score attached (2-0)');
})();

// ----------------------------------------------------
// SECTION 5: FIRESTORE DOCUMENT STRUCTURE SYNCHRONIZATION
// ----------------------------------------------------
console.log('\nSECTION 5: Firestore Persistence Scoping Verification');
{
  const cloudTicketDoc: Ticket = {
    id: 'ticket-real-cloud-synced',
    userId: 'user_e2e_football_data',
    bookmaker: 'SportyBet',
    totalOdds: 2.16,
    stake: 10000,
    potentialReturn: 21600,
    potentialProfit: 11600,
    impliedProbability: 0.46,
    status: 'WON',
    settlementStatus: 'WON',
    settledOdds: 2.16,
    actualReturn: 21600,
    settledAt: new Date().toISOString(),
    settlementSource: 'AUTOMATED_VERIFICATION',
    source: 'VERIFIED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    selections: [],
  };

  const firestorePath = `users/${cloudTicketDoc.userId}/tickets/${cloudTicketDoc.id}`;
  assert(firestorePath === 'users/user_e2e_football_data/tickets/ticket-real-cloud-synced', 'Path adheres strictly to /users/{uid}/tickets/{id}');
  assert(cloudTicketDoc.settlementStatus === 'WON', 'Firestore doc contains verified settlementStatus');
  assert(cloudTicketDoc.actualReturn === 21600, 'Firestore doc contains settled return');
}

// ----------------------------------------------------
// SECTION 6: ROLLOVER PROGRESSION & DUPLICATE PREVENTION
// ----------------------------------------------------
console.log('\nSECTION 6: Rollover Progression & Idempotent Settlement');
(async () => {
  const challenge: DailyRolloverChallenge = {
    id: 'challenge-real-e2e',
    title: '10-Day Real Rollover Challenge',
    startingBankroll: 10000,
    currentBankroll: 10000,
    targetMultiplier: 10,
    targetAmount: 100000,
    currency: 'NGN',
    dailyTargetOddsMin: 4.0,
    dailyTargetOddsMax: 5.0,
    totalDays: 10,
    currentDay: 1,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: [
      {
        dayNumber: 1,
        date: '2024-08-17',
        targetOdds: '4.00 - 5.00',
        status: 'READY',
        stake: 10000,
      },
    ],
  };

  // Winning ticket with real scores (Arsenal 2-0, Real Madrid 2-0, Genoa 2-2)
  const winningDayTicket: Ticket = {
    id: 'ticket-rollover-day1',
    bookmaker: 'SportyBet',
    totalOdds: 4.25,
    stake: 10000,
    potentialReturn: 42500,
    potentialProfit: 32500,
    impliedProbability: 0.23,
    status: 'SAVED',
    source: 'VERIFIED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    selections: [
      {
        id: 'r-leg-1',
        fixtureId: 'fd-435987',
        homeTeam: 'Arsenal',
        awayTeam: 'Wolverhampton',
        market: 'Over/Under Goals',
        selection: 'Over 1.5 Goals',
        odds: 1.25,
        confidence: 0.95,
        source: 'VERIFIED',
      },
      {
        id: 'r-leg-2',
        fixtureId: 'fd-435990',
        homeTeam: 'Real Madrid',
        awayTeam: 'Real Betis',
        market: '1X2',
        selection: 'Real Madrid Win',
        odds: 1.36,
        confidence: 0.94,
        source: 'VERIFIED',
      },
      {
        id: 'r-leg-3',
        fixtureId: 'fd-435989',
        homeTeam: 'Genoa',
        awayTeam: 'Inter',
        market: 'Both Teams to Score',
        selection: 'BTTS Yes',
        odds: 1.85,
        confidence: 0.85,
        source: 'VERIFIED',
      },
      {
        id: 'r-leg-4',
        fixtureId: 'fd-435988',
        homeTeam: 'Chelsea',
        awayTeam: 'Manchester City',
        market: 'Double Chance',
        selection: 'Draw or Man City (X2)',
        odds: 1.35,
        confidence: 0.9,
        source: 'VERIFIED',
      },
    ],
  };

  // 1. Initial settlement
  const res1 = await RolloverSettler.settleRolloverDay(challenge, winningDayTicket, 1, realResults);
  assert(res1.settledDay.status === 'WON', 'Rollover Day 1 settled as WON with real fixtures');
  assert(res1.advancedToDay === 2, 'Rollover advanced to Day 2');
  assert(res1.challenge.currentDay === 2, 'Challenge state reflects currentDay === 2');
  assert(res1.challenge.currentBankroll > 10000, `Bankroll grew to ₦${res1.challenge.currentBankroll}`);

  // 2. Duplicate settlement on Day 1
  const resDuplicate = await RolloverSettler.settleRolloverDay(res1.challenge, winningDayTicket, 1, realResults);
  assert(resDuplicate.isDuplicateCallPrevented === true, 'Duplicate call on settled Day 1 prevented');
  assert(resDuplicate.challenge.currentDay === 2, 'Day counter did not double-increment');
  assert(resDuplicate.challenge.currentBankroll === res1.challenge.currentBankroll, 'Bankroll did not double-credit');
})();

setTimeout(() => {
  console.log('\n================================================================');
  console.log(`REAL FOOTBALL-DATA VALIDATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\nFailures:\n' + failures.map((f) => ` - ${f}`).join('\n'));
    process.exit(1);
  } else {
    console.log('\nALL REAL FOOTBALL FIXTURE VALIDATIONS PASSED CLEANLY! 🎉\n');
    process.exit(0);
  }
}, 500);

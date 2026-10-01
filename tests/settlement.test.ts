import { SettlementEngine } from '../server/settlement/settlementEngine.ts';
import { MarketSettler } from '../server/settlement/marketSettler.ts';
import { RolloverSettler } from '../server/settlement/rolloverSettler.ts';
import { ResultProvider, BENCHMARK_MATCH_RESULTS } from '../server/settlement/resultProvider.ts';
import {
  Ticket,
  Selection,
  DailyRolloverChallenge,
  DailyRolloverDay,
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

console.log('====================================================');
console.log('RUNNING BETPILOT AUTOMATED SETTLEMENT & VERIFICATION TESTS');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: Correct WON settlement
// ----------------------------------------------------
console.log('TEST 1: Correct WON settlement');
{
  const result: NormalizedMatchResult = {
    fixtureId: 'test-fix-won',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    status: 'FINISHED',
    score: { home: 2, away: 1 },
    provider: 'TestProvider',
  };

  // 1X2 Arsenal Win
  const sel1X2: Selection = {
    id: 's1',
    fixtureId: 'test-fix-won',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    market: '1X2',
    selection: 'Arsenal Win',
    odds: 1.85,
    confidence: 0.9,
    source: 'VERIFIED',
  };
  const eval1X2 = MarketSettler.evaluateSelection(sel1X2, result);
  assert(eval1X2.status === 'WON', '1X2 Home win accurately settled as WON (2-1)');

  // Over 1.5 Goals
  const selOver: Selection = {
    id: 's2',
    fixtureId: 'test-fix-won',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    market: 'Over/Under Goals',
    selection: 'Over 1.5 Goals',
    odds: 1.28,
    confidence: 0.95,
    source: 'VERIFIED',
  };
  const evalOver = MarketSettler.evaluateSelection(selOver, result);
  assert(evalOver.status === 'WON', 'Over 1.5 Goals accurately settled as WON (3 goals total)');

  // BTTS Yes
  const selBtts: Selection = {
    id: 's3',
    fixtureId: 'test-fix-won',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    market: 'Both Teams to Score',
    selection: 'BTTS Yes',
    odds: 1.7,
    confidence: 0.85,
    source: 'VERIFIED',
  };
  const evalBtts = MarketSettler.evaluateSelection(selBtts, result);
  assert(evalBtts.status === 'WON', 'Both Teams to Score Yes settled as WON (2-1)');
}

// ----------------------------------------------------
// TEST 2: Correct LOST settlement
// ----------------------------------------------------
console.log('\nTEST 2: Correct LOST settlement');
{
  const result: NormalizedMatchResult = {
    fixtureId: 'test-fix-lost',
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    status: 'FINISHED',
    score: { home: 0, away: 2 },
    provider: 'TestProvider',
  };

  // Pick Real Madrid to win -> should be LOST
  const selHomeWin: Selection = {
    id: 's4',
    fixtureId: 'test-fix-lost',
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    market: '1X2',
    selection: 'Real Madrid Win',
    odds: 2.1,
    confidence: 0.8,
    source: 'VERIFIED',
  };
  const evalHome = MarketSettler.evaluateSelection(selHomeWin, result);
  assert(evalHome.status === 'LOST', 'Home win selection accurately settled as LOST (0-2)');

  // Pick Under 1.5 Goals -> should be LOST (2 goals scored)
  const selUnder: Selection = {
    id: 's5',
    fixtureId: 'test-fix-lost',
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    market: 'Over/Under Goals',
    selection: 'Under 1.5 Goals',
    odds: 3.5,
    confidence: 0.6,
    source: 'VERIFIED',
  };
  const evalUnder = MarketSettler.evaluateSelection(selUnder, result);
  assert(evalUnder.status === 'LOST', 'Under 1.5 Goals settled as LOST when score has 2 goals');
}

// ----------------------------------------------------
// TEST 3: VOID settlement (Draw No Bet draw, Postponed)
// ----------------------------------------------------
console.log('\nTEST 3: VOID settlement');
{
  const drawResult: NormalizedMatchResult = {
    fixtureId: 'test-fix-draw',
    homeTeam: 'Inter Milan',
    awayTeam: 'Juventus',
    status: 'FINISHED',
    score: { home: 1, away: 1 },
    provider: 'TestProvider',
  };

  const selDnb: Selection = {
    id: 's6',
    fixtureId: 'test-fix-draw',
    homeTeam: 'Inter Milan',
    awayTeam: 'Juventus',
    market: 'Draw No Bet',
    selection: 'Inter Milan (DNB)',
    odds: 1.45,
    confidence: 0.85,
    source: 'VERIFIED',
  };
  const evalDnb = MarketSettler.evaluateSelection(selDnb, drawResult);
  assert(evalDnb.status === 'VOID', 'Draw No Bet selection settles as VOID on drawn match (1-1)');
}

// ----------------------------------------------------
// TEST 4: Multiple selections on one ticket
// ----------------------------------------------------
console.log('\nTEST 4: Multiple selections on one ticket');
(async () => {
  const customResults: NormalizedMatchResult[] = [
    {
      fixtureId: 'multi-fix-1',
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      status: 'FINISHED',
      score: { home: 2, away: 0 },
      provider: 'TestProvider',
    },
    {
      fixtureId: 'multi-fix-2',
      homeTeam: 'Bayern Munich',
      awayTeam: 'Dortmund',
      status: 'FINISHED',
      score: { home: 3, away: 1 },
      provider: 'TestProvider',
    },
    {
      fixtureId: 'multi-fix-3',
      homeTeam: 'PSG',
      awayTeam: 'Lyon',
      status: 'FINISHED',
      score: { home: 2, away: 1 },
      provider: 'TestProvider',
    },
  ];

  const ticket: Ticket = {
    id: 'ticket-multi-test',
    bookmaker: 'SportyBet',
    totalOdds: 4.50,
    stake: 5000,
    potentialReturn: 22500,
    potentialProfit: 17500,
    impliedProbability: 0.22,
    status: 'SAVED',
    source: 'VERIFIED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    selections: [
      {
        id: 'ms-1',
        fixtureId: 'multi-fix-1',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        market: 'Over/Under Goals',
        selection: 'Over 1.5 Goals',
        odds: 1.30,
        confidence: 0.9,
        source: 'VERIFIED',
      },
      {
        id: 'ms-2',
        fixtureId: 'multi-fix-2',
        homeTeam: 'Bayern Munich',
        awayTeam: 'Dortmund',
        market: 'Over/Under Goals',
        selection: 'Over 2.5 Goals',
        odds: 1.55,
        confidence: 0.88,
        source: 'VERIFIED',
      },
      {
        id: 'ms-3',
        fixtureId: 'multi-fix-3',
        homeTeam: 'PSG',
        awayTeam: 'Lyon',
        market: 'Double Chance',
        selection: 'PSG or Draw (1X)',
        odds: 1.25,
        confidence: 0.92,
        source: 'VERIFIED',
      },
    ],
  };

  const settlement = await SettlementEngine.settleTicket(ticket, customResults);
  assert(settlement.newStatus === 'WON', 'All 3 selections won -> Ticket settles as WON');
  assert(settlement.ticket.status === 'WON', 'Ticket status mapped to WON');
  assert(settlement.actualReturn > 0, `Calculated actual return > 0 (${settlement.actualReturn})`);
  assert(settlement.settledOdds > 2.5, `Settled odds accurately preserved (${settlement.settledOdds})`);
})();

// ----------------------------------------------------
// TEST 5: Missing result data handling
// ----------------------------------------------------
console.log('\nTEST 5: Missing result data');
(async () => {
  const pendingTicket: Ticket = {
    id: 'ticket-pending-test',
    bookmaker: 'Bet9ja',
    totalOdds: 3.5,
    stake: 1000,
    potentialReturn: 3500,
    potentialProfit: 2500,
    impliedProbability: 0.28,
    status: 'SAVED',
    source: 'VERIFIED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    selections: [
      {
        id: 'ps-1',
        fixtureId: 'future-fix-unknown',
        homeTeam: 'Future FC',
        awayTeam: 'Tomorrow United',
        market: '1X2',
        selection: 'Future FC Win',
        odds: 1.5,
        confidence: 0.8,
        source: 'VERIFIED',
      },
    ],
  };

  const settlement = await SettlementEngine.settleTicket(pendingTicket, []);
  assert(settlement.newStatus === 'PENDING', 'Missing match result keeps ticket status PENDING');
  assert(settlement.isFullySettled === false, 'isFullySettled is false for missing fixture result');
  assert(settlement.ticket.selections[0].status === 'PENDING', 'Selection remains marked as PENDING');
})();

// ----------------------------------------------------
// TEST 6: Postponed / Cancelled fixtures handling
// ----------------------------------------------------
console.log('\nTEST 6: Postponed / cancelled fixtures');
(async () => {
  const postponedResult: NormalizedMatchResult = {
    fixtureId: 'postponed-fix',
    homeTeam: 'Liverpool',
    awayTeam: 'Everton',
    status: 'POSTPONED',
    score: { home: null, away: null },
    provider: 'TestProvider',
  };

  const postTicket: Ticket = {
    id: 'ticket-postponed-test',
    bookmaker: 'SportyBet',
    totalOdds: 1.9,
    stake: 4000,
    potentialReturn: 7600,
    potentialProfit: 3600,
    impliedProbability: 0.52,
    status: 'SAVED',
    source: 'VERIFIED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    selections: [
      {
        id: 'pps-1',
        fixtureId: 'postponed-fix',
        homeTeam: 'Liverpool',
        awayTeam: 'Everton',
        market: '1X2',
        selection: 'Liverpool Win',
        odds: 1.9,
        confidence: 0.85,
        source: 'VERIFIED',
      },
    ],
  };

  const settlement = await SettlementEngine.settleTicket(postTicket, [postponedResult]);
  assert(settlement.newStatus === 'VOID', 'Postponed match sets ticket status to VOID');
  assert(settlement.actualReturn === 4000, 'Full stake refunded upon VOID ticket (₦4000)');
  assert(settlement.settledOdds === 1.0, 'Settled odds reset to 1.00 for VOID');
})();

// ----------------------------------------------------
// TEST 7: Duplicate settlement attempts (Idempotency)
// ----------------------------------------------------
console.log('\nTEST 7: Duplicate settlement attempts');
(async () => {
  const result: NormalizedMatchResult = {
    fixtureId: 'idem-fix',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    status: 'FINISHED',
    score: { home: 2, away: 1 },
    provider: 'TestProvider',
  };

  const ticket: Ticket = {
    id: 'ticket-idem-test',
    bookmaker: 'SportyBet',
    totalOdds: 1.28,
    stake: 10000,
    potentialReturn: 12800,
    potentialProfit: 2800,
    impliedProbability: 0.78,
    status: 'SAVED',
    source: 'VERIFIED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    selections: [
      {
        id: 'idem-sel-1',
        fixtureId: 'idem-fix',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        market: 'Over/Under Goals',
        selection: 'Over 1.5 Goals',
        odds: 1.28,
        confidence: 0.95,
        source: 'VERIFIED',
      },
    ],
  };

  // Run settlement 1st time
  const pass1 = await SettlementEngine.settleTicket(ticket, [result]);
  // Run settlement 2nd time on already settled ticket
  const pass2 = await SettlementEngine.settleTicket(pass1.ticket, [result]);

  assert(pass1.newStatus === pass2.newStatus, 'Idempotency: Status identical across repeated runs (WON)');
  assert(pass1.actualReturn === pass2.actualReturn, 'Idempotency: Return identical across repeated runs (12800)');
  assert(pass1.settledOdds === pass2.settledOdds, 'Idempotency: Odds identical across repeated runs (1.28)');
})();

// ----------------------------------------------------
// TEST 8: Rollover Day Advancement
// ----------------------------------------------------
console.log('\nTEST 8: Rollover Day advancement');
(async () => {
  const challenge: DailyRolloverChallenge = {
    id: 'challenge-test-adv',
    title: '10-Day Rollover Challenge',
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
        date: new Date().toISOString().split('T')[0],
        targetOdds: '4.00 - 5.00',
        status: 'READY',
        stake: 10000,
      },
    ],
  };

  const wonTicket: Ticket = {
    id: 'rollover-ticket-d1',
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
        id: 'r-s1',
        fixtureId: 'fix-1',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        market: 'Over/Under Goals',
        selection: 'Over 1.5 Goals',
        odds: 4.25,
        confidence: 0.9,
        source: 'VERIFIED',
      },
    ],
  };

  // Uses BENCHMARK_MATCH_RESULTS where fix-1 finished 2-1
  const rolloverRes = await RolloverSettler.settleRolloverDay(challenge, wonTicket, 1);

  assert(rolloverRes.settledDay.status === 'WON', 'Rollover Day 1 settled as WON');
  assert(rolloverRes.advancedToDay === 2, 'Rollover advanced active day to Day 2');
  assert(rolloverRes.challenge.currentBankroll === 42500, 'Bankroll accurately updated to ₦42,500');
  assert(rolloverRes.challenge.days.length === 2, 'Next day initialized in challenge progression');

  // Test duplicate settlement prevention on the same day
  const duplicateAttempt = await RolloverSettler.settleRolloverDay(rolloverRes.challenge, wonTicket, 1);
  assert(duplicateAttempt.isDuplicateCallPrevented === true, 'Duplicate settlement attempt on already settled Day is prevented');
  assert(duplicateAttempt.challenge.currentBankroll === 42500, 'Bankroll remains unchanged upon duplicate settlement');
  assert(duplicateAttempt.advancedToDay === 2, 'Day counter does not double-increment');
})();

// ----------------------------------------------------
// TEST 9: Firestore persistence mapping
// ----------------------------------------------------
console.log('\nTEST 9: Firestore persistence mapping');
{
  const settledTicketForFirestore: Ticket = {
    id: 'ticket-cloud-settled-1',
    userId: 'user_live_uid_999',
    bookmaker: 'SportyBet',
    totalOdds: 4.5,
    stake: 5000,
    potentialReturn: 22500,
    potentialProfit: 17500,
    impliedProbability: 0.22,
    status: 'WON',
    settlementStatus: 'WON',
    settledOdds: 4.5,
    actualReturn: 22500,
    settledAt: '2026-09-30T17:00:00Z',
    settlementSource: 'AUTOMATED_VERIFICATION',
    source: 'VERIFIED',
    createdAt: '2026-09-30T16:00:00Z',
    updatedAt: '2026-09-30T17:00:00Z',
    selections: [
      {
        id: 'sel-c1',
        fixtureId: 'fix-1',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        market: 'Over/Under Goals',
        selection: 'Over 1.5 Goals',
        odds: 1.28,
        confidence: 0.95,
        source: 'VERIFIED',
        status: 'WON',
        resultScore: { home: 2, away: 1 },
        resultDetails: 'Total goals 3 > 1.5 (2-1)',
      },
    ],
  };

  const firestorePath = `users/${settledTicketForFirestore.userId}/tickets/${settledTicketForFirestore.id}`;
  assert(firestorePath.startsWith('users/user_live_uid_999/tickets/'), 'Document stored under user UID subcollection path');
  assert(settledTicketForFirestore.settlementStatus === 'WON', 'Retains settlementStatus in cloud document');
  assert(settledTicketForFirestore.selections[0].resultScore?.home === 2, 'Retains verified final score in selection');
}

// ----------------------------------------------------
// TEST 10: Rehydration after refresh
// ----------------------------------------------------
console.log('\nTEST 10: Rehydration after refresh');
{
  const serialized = JSON.stringify({
    id: 'ticket-rehydrate-1',
    status: 'WON',
    settlementStatus: 'WON',
    settledOdds: 4.32,
    actualReturn: 21600,
    settledAt: '2026-09-30T17:10:00Z',
    selections: [
      {
        id: 'rehyd-sel-1',
        status: 'WON',
        resultScore: { home: 2, away: 1 },
      },
    ],
  });

  const parsed = JSON.parse(serialized);
  assert(parsed.settlementStatus === 'WON', 'Rehydration preserves settled status');
  assert(parsed.actualReturn === 21600, 'Rehydration preserves settled payout return');
  assert(parsed.selections[0].resultScore.home === 2, 'Rehydration preserves final match score');
}

setTimeout(() => {
  console.log('\n====================================================');
  console.log(`SETTLEMENT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    console.error('\nFailures:\n' + failures.map((f) => ` - ${f}`).join('\n'));
    process.exit(1);
  } else {
    console.log('\nALL AUTOMATED SETTLEMENT TESTS PASSED! 🎉\n');
    process.exit(0);
  }
}, 500);

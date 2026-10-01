import { CalibrationEngine } from '../server/calibration/calibrationEngine.ts';
import {
  Ticket,
  Selection,
  PredictionSnapshot,
  CalibrationDashboardFilter,
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
console.log('RUNNING BETPILOT MODEL ACCURACY & ROI CALIBRATION TESTS');
console.log('================================================================\n');

// ----------------------------------------------------
// TEST 1: Win-Rate Calculation
// ----------------------------------------------------
console.log('TEST 1: Win-Rate Calculation');
{
  const tickets: Ticket[] = [
    {
      id: 't-wr-1',
      bookmaker: 'SportyBet',
      status: 'WON',
      settlementStatus: 'WON',
      totalOdds: 1.5,
      stake: 1000,
      potentialReturn: 1500,
      potentialProfit: 500,
      impliedProbability: 0.67,
      source: 'VERIFIED',
      createdAt: '2026-09-01T12:00:00Z',
      updatedAt: '2026-09-01T14:00:00Z',
      settledAt: '2026-09-01T14:00:00Z',
      selections: [
        {
          id: 's-1',
          homeTeam: 'Arsenal',
          awayTeam: 'Wolves',
          market: '1X2',
          selection: 'Arsenal Win',
          odds: 1.5,
          confidence: 0.75,
          source: 'VERIFIED',
          status: 'WON',
        },
        {
          id: 's-2',
          homeTeam: 'Chelsea',
          awayTeam: 'Man City',
          market: '1X2',
          selection: 'Chelsea Win',
          odds: 2.0,
          confidence: 0.65,
          source: 'VERIFIED',
          status: 'LOST',
        },
        {
          id: 's-3',
          homeTeam: 'Real Madrid',
          awayTeam: 'Betis',
          market: 'Over/Under Goals',
          selection: 'Over 1.5 Goals',
          odds: 1.25,
          confidence: 0.85,
          source: 'VERIFIED',
          status: 'WON',
        },
        {
          id: 's-4',
          homeTeam: 'Barcelona',
          awayTeam: 'Sevilla',
          market: '1X2',
          selection: 'Barcelona Win',
          odds: 1.3,
          confidence: 0.8,
          source: 'VERIFIED',
          status: 'WON',
        },
      ],
    },
  ];

  // 3 WON, 1 LOST out of 4 total -> 3 / 4 = 75.0%
  const res = CalibrationEngine.computeDashboard(tickets);
  assert(res.accuracy.totalSettledSelections === 4, 'Total settled selections equals 4');
  assert(res.accuracy.correctSelections === 3, 'Correct selections equals 3');
  assert(res.accuracy.incorrectSelections === 1, 'Incorrect selections equals 1');
  assert(res.accuracy.winRate === 75.0, `Win rate calculated as 75.0% (got ${res.accuracy.winRate}%)`);
}

// ----------------------------------------------------
// TEST 2: ROI Calculation
// ----------------------------------------------------
console.log('\nTEST 2: ROI Calculation');
{
  const tickets: Ticket[] = [
    {
      id: 't-roi-1',
      bookmaker: 'SportyBet',
      status: 'WON',
      settlementStatus: 'WON',
      totalOdds: 2.0,
      stake: 10000,
      potentialReturn: 20000,
      actualReturn: 20000,
      potentialProfit: 10000,
      impliedProbability: 0.5,
      source: 'VERIFIED',
      createdAt: '2026-09-02T12:00:00Z',
      updatedAt: '2026-09-02T14:00:00Z',
      selections: [
        { id: 'r1', homeTeam: 'A', awayTeam: 'B', market: '1X2', selection: 'A Win', odds: 2.0, confidence: 0.6, source: 'VERIFIED', status: 'WON' }
      ],
    },
    {
      id: 't-roi-2',
      bookmaker: 'SportyBet',
      status: 'LOST',
      settlementStatus: 'LOST',
      totalOdds: 1.8,
      stake: 5000,
      potentialReturn: 9000,
      actualReturn: 0,
      potentialProfit: 4000,
      impliedProbability: 0.55,
      source: 'VERIFIED',
      createdAt: '2026-09-02T15:00:00Z',
      updatedAt: '2026-09-02T17:00:00Z',
      selections: [
        { id: 'r2', homeTeam: 'C', awayTeam: 'D', market: '1X2', selection: 'C Win', odds: 1.8, confidence: 0.65, source: 'VERIFIED', status: 'LOST' }
      ],
    },
  ];

  // Total stake: 10000 + 5000 = 15000
  // Total returns: 20000 + 0 = 20000
  // Net profit: 20000 - 15000 = +5000
  // ROI: (5000 / 15000) * 100 = 33.3%
  const res = CalibrationEngine.computeDashboard(tickets);
  assert(res.financial.totalStakes === 15000, 'Total stakes computed correctly (15000)');
  assert(res.financial.totalReturns === 20000, 'Total returns computed correctly (20000)');
  assert(res.financial.netProfit === 5000, 'Net profit computed correctly (+5000)');
  assert(res.financial.roi === 33.3, `ROI computed correctly as +33.3% (got ${res.financial.roi}%)`);
}

// ----------------------------------------------------
// TEST 3: Brier Score Calculation
// ----------------------------------------------------
console.log('\nTEST 3: Brier Score Calculation');
{
  // Prediction 1: prob = 0.8, outcome = WON (1.0) -> (0.8 - 1)^2 = 0.04
  // Prediction 2: prob = 0.7, outcome = LOST (0.0) -> (0.7 - 0)^2 = 0.49
  // Brier score: (0.04 + 0.49) / 2 = 0.53 / 2 = 0.265
  const tickets: Ticket[] = [
    {
      id: 't-brier',
      bookmaker: 'SportyBet',
      status: 'SAVED',
      totalOdds: 2.0,
      stake: 1000,
      potentialReturn: 2000,
      potentialProfit: 1000,
      impliedProbability: 0.5,
      source: 'VERIFIED',
      createdAt: '2026-09-03T12:00:00Z',
      updatedAt: '2026-09-03T14:00:00Z',
      selections: [
        { id: 'b1', homeTeam: 'A', awayTeam: 'B', market: '1X2', selection: 'A Win', odds: 1.25, confidence: 0.8, source: 'VERIFIED', status: 'WON' },
        { id: 'b2', homeTeam: 'C', awayTeam: 'D', market: '1X2', selection: 'C Win', odds: 1.45, confidence: 0.7, source: 'VERIFIED', status: 'LOST' },
      ],
    },
  ];

  const res = CalibrationEngine.computeDashboard(tickets);
  assert(res.accuracy.brierScore === 0.265, `Brier score matches quadratic formula (expected 0.265, got ${res.accuracy.brierScore})`);
}

// ----------------------------------------------------
// TEST 4: Calibration Buckets
// ----------------------------------------------------
console.log('\nTEST 4: Calibration Buckets');
{
  const tickets: Ticket[] = [
    {
      id: 't-cb',
      bookmaker: 'SportyBet',
      status: 'SAVED',
      totalOdds: 3.0,
      stake: 1000,
      potentialReturn: 3000,
      potentialProfit: 2000,
      impliedProbability: 0.33,
      source: 'VERIFIED',
      createdAt: '2026-09-04T12:00:00Z',
      updatedAt: '2026-09-04T14:00:00Z',
      selections: [
        // 50-59% bucket
        { id: 'cb1', homeTeam: 'A', awayTeam: 'B', market: '1X2', selection: 'Pick 1', odds: 1.8, confidence: 0.55, source: 'VERIFIED', status: 'WON' },
        // 70-79% bucket
        { id: 'cb2', homeTeam: 'C', awayTeam: 'D', market: '1X2', selection: 'Pick 2', odds: 1.35, confidence: 0.75, source: 'VERIFIED', status: 'WON' },
        { id: 'cb3', homeTeam: 'E', awayTeam: 'F', market: '1X2', selection: 'Pick 3', odds: 1.38, confidence: 0.75, source: 'VERIFIED', status: 'LOST' },
        // 90%+ bucket
        { id: 'cb4', homeTeam: 'G', awayTeam: 'H', market: '1X2', selection: 'Pick 4', odds: 1.1, confidence: 0.95, source: 'VERIFIED', status: 'WON' },
      ],
    },
  ];

  const res = CalibrationEngine.computeDashboard(tickets);
  const b50 = res.calibrationBuckets.find((b) => b.bucket === '50-59%');
  const b70 = res.calibrationBuckets.find((b) => b.bucket === '70-79%');
  const b90 = res.calibrationBuckets.find((b) => b.bucket === '90%+');

  assert(b50?.count === 1 && b50.observedWinRate === 100, 'Bucket 50-59% contains 1 pick with 100% win rate');
  assert(b70?.count === 2 && b70.observedWinRate === 50, 'Bucket 70-79% contains 2 picks with 50% win rate');
  assert(b90?.count === 1 && b90.observedWinRate === 100, 'Bucket 90%+ contains 1 pick with 100% win rate');
  assert(b70 !== undefined && Math.abs(b70.difference) > 0, 'Difference between predicted and observed win rate is tracked');
}

// ----------------------------------------------------
// TEST 5: VOID Exclusion from Win-Rate and Brier
// ----------------------------------------------------
console.log('\nTEST 5: VOID Exclusion');
{
  const tickets: Ticket[] = [
    {
      id: 't-void-test',
      bookmaker: 'SportyBet',
      status: 'SAVED',
      totalOdds: 2.0,
      stake: 1000,
      potentialReturn: 2000,
      potentialProfit: 1000,
      impliedProbability: 0.5,
      source: 'VERIFIED',
      createdAt: '2026-09-05T12:00:00Z',
      updatedAt: '2026-09-05T14:00:00Z',
      selections: [
        { id: 'v1', homeTeam: 'A', awayTeam: 'B', market: '1X2', selection: 'A Win', odds: 1.5, confidence: 0.8, source: 'VERIFIED', status: 'WON' },
        { id: 'v2', homeTeam: 'C', awayTeam: 'D', market: '1X2', selection: 'C Win', odds: 1.9, confidence: 0.6, source: 'VERIFIED', status: 'VOID' }, // POSTPONED / VOID
      ],
    },
  ];

  // 1 WON, 1 VOID -> Win rate must be 1 / 1 = 100% (VOID must not be in denominator as lost!)
  const res = CalibrationEngine.computeDashboard(tickets);
  assert(res.accuracy.totalSettledSelections === 1, 'Total settled selections counts only valid non-void picks (1)');
  assert(res.accuracy.voidSelections === 1, 'Void selections tracked separately (1)');
  assert(res.accuracy.winRate === 100.0, 'Win rate strictly excludes VOID from denominator (100.0%)');
  // Brier score should only consider the WON selection: (0.8 - 1)^2 = 0.04
  assert(res.accuracy.brierScore === 0.04, `Brier score strictly excludes VOID legs (expected 0.04, got ${res.accuracy.brierScore})`);
}

// ----------------------------------------------------
// TEST 6: PENDING Exclusion
// ----------------------------------------------------
console.log('\nTEST 6: PENDING Exclusion');
{
  const tickets: Ticket[] = [
    {
      id: 't-pending-test',
      bookmaker: 'SportyBet',
      status: 'SAVED',
      totalOdds: 2.0,
      stake: 1000,
      potentialReturn: 2000,
      potentialProfit: 1000,
      impliedProbability: 0.5,
      source: 'VERIFIED',
      createdAt: '2026-09-06T12:00:00Z',
      updatedAt: '2026-09-06T14:00:00Z',
      selections: [
        { id: 'p1', homeTeam: 'A', awayTeam: 'B', market: '1X2', selection: 'A Win', odds: 1.5, confidence: 0.8, source: 'VERIFIED', status: 'WON' },
        { id: 'p2', homeTeam: 'C', awayTeam: 'D', market: '1X2', selection: 'C Win', odds: 1.5, confidence: 0.8, source: 'VERIFIED', status: 'PENDING' },
      ],
    },
  ];

  const res = CalibrationEngine.computeDashboard(tickets);
  assert(res.accuracy.totalSettledSelections === 1, 'PENDING selections are excluded from settled accuracy metrics');
  assert(res.accuracy.winRate === 100.0, 'Win rate reflects only settled selections (100.0%)');
}

// ----------------------------------------------------
// TEST 7: Date Filtering
// ----------------------------------------------------
console.log('\nTEST 7: Date Filtering');
{
  const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(); // 40 days ago
  const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago

  const tickets: Ticket[] = [
    {
      id: 't-old',
      bookmaker: 'SportyBet',
      status: 'WON',
      settlementStatus: 'WON',
      totalOdds: 1.5,
      stake: 1000,
      potentialReturn: 1500,
      potentialProfit: 500,
      impliedProbability: 0.67,
      source: 'VERIFIED',
      createdAt: oldDate,
      updatedAt: oldDate,
      settledAt: oldDate,
      selections: [
        { id: 'o1', homeTeam: 'A', awayTeam: 'B', market: '1X2', selection: 'A Win', odds: 1.5, confidence: 0.8, source: 'VERIFIED', status: 'WON', settledAt: oldDate }
      ],
    },
    {
      id: 't-recent',
      bookmaker: 'SportyBet',
      status: 'LOST',
      settlementStatus: 'LOST',
      totalOdds: 1.5,
      stake: 1000,
      potentialReturn: 1500,
      potentialProfit: 500,
      impliedProbability: 0.67,
      source: 'VERIFIED',
      createdAt: recentDate,
      updatedAt: recentDate,
      settledAt: recentDate,
      selections: [
        { id: 'r1', homeTeam: 'C', awayTeam: 'D', market: '1X2', selection: 'C Win', odds: 1.5, confidence: 0.8, source: 'VERIFIED', status: 'LOST', settledAt: recentDate }
      ],
    },
  ];

  // With '7d' filter, only the 2-day-old ticket should appear
  const res7d = CalibrationEngine.computeDashboard(tickets, [], { dateRange: '7d' });
  assert(res7d.accuracy.totalSettledSelections === 1, '7d filter filters out 40-day-old selection');
  assert(res7d.accuracy.winRate === 0.0, '7d filter accurately captures recent loss');

  // With 'all' filter, both appear
  const resAll = CalibrationEngine.computeDashboard(tickets, [], { dateRange: 'all' });
  assert(resAll.accuracy.totalSettledSelections === 2, 'All Time filter includes both selections');
  assert(resAll.accuracy.winRate === 50.0, 'All Time win rate evaluates across entire date range');
}

// ----------------------------------------------------
// TEST 8: Market Filtering
// ----------------------------------------------------
console.log('\nTEST 8: Market Filtering');
{
  const tickets: Ticket[] = [
    {
      id: 't-market-filter',
      bookmaker: 'SportyBet',
      status: 'SAVED',
      totalOdds: 2.0,
      stake: 1000,
      potentialReturn: 2000,
      potentialProfit: 1000,
      impliedProbability: 0.5,
      source: 'VERIFIED',
      createdAt: '2026-09-08T12:00:00Z',
      updatedAt: '2026-09-08T14:00:00Z',
      selections: [
        { id: 'm1', homeTeam: 'A', awayTeam: 'B', market: '1X2', selection: 'A Win', odds: 1.5, confidence: 0.8, source: 'VERIFIED', status: 'WON' },
        { id: 'm2', homeTeam: 'C', awayTeam: 'D', market: 'Over/Under Goals', selection: 'Over 1.5 Goals', odds: 1.3, confidence: 0.85, source: 'VERIFIED', status: 'LOST' },
      ],
    },
  ];

  const res1X2 = CalibrationEngine.computeDashboard(tickets, [], { market: '1x2' });
  assert(res1X2.accuracy.totalSettledSelections === 1, 'Market filter 1X2 extracts only 1X2 selection');
  assert(res1X2.accuracy.winRate === 100.0, 'Win rate for 1X2 is 100%');

  const resOver = CalibrationEngine.computeDashboard(tickets, [], { market: 'over_under' });
  assert(resOver.accuracy.totalSettledSelections === 1, 'Market filter over_under extracts only Over/Under selection');
  assert(resOver.accuracy.winRate === 0.0, 'Win rate for Over/Under is 0%');
}

// ----------------------------------------------------
// TEST 9: Sport Filtering
// ----------------------------------------------------
console.log('\nTEST 9: Sport Filtering');
{
  const tickets: Ticket[] = [
    {
      id: 't-sport-filter',
      bookmaker: 'SportyBet',
      status: 'SAVED',
      totalOdds: 2.0,
      stake: 1000,
      potentialReturn: 2000,
      potentialProfit: 1000,
      impliedProbability: 0.5,
      source: 'VERIFIED',
      createdAt: '2026-09-09T12:00:00Z',
      updatedAt: '2026-09-09T14:00:00Z',
      selections: [
        { id: 'sp1', homeTeam: 'Arsenal', awayTeam: 'Chelsea', competition: 'Premier League', market: '1X2', selection: 'Arsenal Win', odds: 1.5, confidence: 0.8, source: 'VERIFIED', status: 'WON' },
        { id: 'sp2', homeTeam: 'LA Lakers', awayTeam: 'Boston Celtics', competition: 'NBA', market: '1X2', selection: 'Lakers Win', odds: 1.9, confidence: 0.6, source: 'VERIFIED', status: 'LOST' },
      ],
    },
  ];

  const resFootball = CalibrationEngine.computeDashboard(tickets, [], { sport: 'football' });
  assert(resFootball.accuracy.totalSettledSelections === 1, 'Sport filter (football) selects only football fixture');
  assert(resFootball.accuracy.winRate === 100.0, 'Football win rate is 100.0%');

  const resBasketball = CalibrationEngine.computeDashboard(tickets, [], { sport: 'basketball' });
  assert(resBasketball.accuracy.totalSettledSelections === 1, 'Sport filter (basketball) selects only basketball fixture');
  assert(resBasketball.accuracy.winRate === 0.0, 'Basketball win rate is 0.0%');
}

// ----------------------------------------------------
// TEST 10: Empty Dataset Handling
// ----------------------------------------------------
console.log('\nTEST 10: Empty Dataset Handling');
{
  const resEmpty = CalibrationEngine.computeDashboard([], []);
  assert(resEmpty.accuracy.totalSettledSelections === 0, 'Empty dataset produces 0 total settled selections');
  assert(resEmpty.accuracy.winRate === 0, 'Empty dataset produces 0% win rate without throwing NaN');
  assert(resEmpty.accuracy.brierScore === 0, 'Empty dataset produces 0 Brier score without throwing NaN');
  assert(resEmpty.financial.roi === 0, 'Empty dataset produces 0% ROI without division by zero');
  assert(resEmpty.calibrationBuckets.length === 5, 'Calibration buckets array initialized cleanly');
}

// ----------------------------------------------------
// TEST 11: Accumulator Calculations
// ----------------------------------------------------
console.log('\nTEST 11: Accumulator Calculations');
{
  const tickets: Ticket[] = [
    // Single ticket (1 leg)
    {
      id: 't-single',
      bookmaker: 'SportyBet',
      status: 'WON',
      settlementStatus: 'WON',
      totalOdds: 1.5,
      stake: 2000,
      actualReturn: 3000,
      potentialReturn: 3000,
      potentialProfit: 1000,
      impliedProbability: 0.67,
      source: 'VERIFIED',
      createdAt: '2026-09-10T12:00:00Z',
      updatedAt: '2026-09-10T14:00:00Z',
      selections: [
        { id: 's-sing-1', homeTeam: 'A', awayTeam: 'B', market: '1X2', selection: 'A Win', odds: 1.5, confidence: 0.8, source: 'VERIFIED', status: 'WON' },
      ],
    },
    // Accumulator ticket (3 legs)
    {
      id: 't-acca',
      bookmaker: 'SportyBet',
      status: 'WON',
      settlementStatus: 'WON',
      totalOdds: 4.5,
      stake: 5000,
      actualReturn: 22500,
      potentialReturn: 22500,
      potentialProfit: 17500,
      impliedProbability: 0.22,
      source: 'VERIFIED',
      createdAt: '2026-09-10T15:00:00Z',
      updatedAt: '2026-09-10T17:00:00Z',
      selections: [
        { id: 'a-leg-1', homeTeam: 'C', awayTeam: 'D', market: '1X2', selection: 'C Win', odds: 1.5, confidence: 0.8, source: 'VERIFIED', status: 'WON' },
        { id: 'a-leg-2', homeTeam: 'E', awayTeam: 'F', market: 'Over/Under Goals', selection: 'Over 1.5', odds: 1.5, confidence: 0.8, source: 'VERIFIED', status: 'WON' },
        { id: 'a-leg-3', homeTeam: 'G', awayTeam: 'H', market: 'Double Chance', selection: '1X', odds: 2.0, confidence: 0.7, source: 'VERIFIED', status: 'WON' },
      ],
    },
  ];

  const res = CalibrationEngine.computeDashboard(tickets);
  assert(res.bettingFormats.singlesCount === 1, 'Correct singles count (1)');
  assert(res.bettingFormats.singlesWon === 1, 'Correct singles won count (1)');
  assert(res.bettingFormats.singlesWinRate === 100.0, 'Singles win rate 100%');
  assert(res.bettingFormats.accumulatorsCount === 1, 'Correct accumulator count (1)');
  assert(res.bettingFormats.accumulatorsWon === 1, 'Correct accumulator won count (1)');
  assert(res.bettingFormats.avgAccumulatorLegs === 3.0, 'Average accumulator legs is 3.0');
  assert(res.bettingFormats.avgWinningOdds > 0, 'Average winning odds tracked');
}

setTimeout(() => {
  console.log('\n================================================================');
  console.log(`CALIBRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\nFailures:\n' + failures.map((f) => ` - ${f}`).join('\n'));
    process.exit(1);
  } else {
    console.log('\nALL MODEL ACCURACY & ROI CALIBRATION TESTS PASSED! 🎉\n');
    process.exit(0);
  }
}, 500);

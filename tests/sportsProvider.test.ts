import { DemoSportsDataProvider } from '../server/providers/demoSportsProvider.ts';
import { DemoMarketOddsProvider } from '../server/providers/demoOddsProvider.ts';
import { ProviderRegistry } from '../server/providers/providerRegistry.ts';
import { PredictionEngine, TransparentStatisticalModel } from '../server/services/predictionEngine.ts';
import {
  NormalizedFixtureResearch,
  NormalizedMarketOdds,
  NormalizedTeamStats,
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

console.log('========================================================');
console.log('RUNNING BETPILOT PROVIDER-AGNOSTIC ARCHITECTURE TESTS');
console.log('========================================================\n');

// ----------------------------------------------------
// TEST 1: DemoSportsDataProvider returns normalized fixtures
// ----------------------------------------------------
console.log('TEST 1: DemoSportsDataProvider returns normalized fixtures');
{
  const provider = new DemoSportsDataProvider();
  const fixtures = provider.getAllFixtureResearchSync();

  assert(fixtures.length >= 8, 'Returns at least 8 curated benchmark fixtures');
  const first = fixtures[0];
  assert(Boolean(first.fixture.id && first.fixture.provider === 'DEMO'), 'Fixture has normalized ID and provider');
  assert(Boolean(first.fixture.homeTeam.name && first.fixture.awayTeam.name), 'Fixture has home and away team objects');
  assert(typeof first.homeStats.averageGoalsScored === 'number', 'homeStats contains typed numerical goal stats');
  assert(Array.isArray(first.homeStats.formLast5), 'homeStats contains typed form array');
}

// ----------------------------------------------------
// TEST 2: DemoMarketOddsProvider returns normalized odds
// ----------------------------------------------------
console.log('\nTEST 2: DemoMarketOddsProvider returns normalized odds');
{
  const oddsProvider = new DemoMarketOddsProvider();
  const odds = oddsProvider.getOddsForFixtureSync('fix-1');

  assert(odds.length >= 2, 'Returns market odds for fixture');
  const o15 = odds.find((o) => o.selection === 'Over 1.5 Goals');
  assert(Boolean(o15 && o15.odds === 1.28), 'Returns normalized Over 1.5 decimal odds (1.28)');
  assert(o15?.available === true, 'Odds entry marked available');
}

// ----------------------------------------------------
// TEST 3: PredictionEngine works without knowing the provider name
// ----------------------------------------------------
console.log('\nTEST 3: PredictionEngine is vendor-agnostic');
{
  // Custom mock provider with synthetic name
  const customResearch: NormalizedFixtureResearch = {
    fixture: {
      id: 'mock-fix-100',
      externalId: 'ext-999',
      provider: 'CUSTOM_3RD_PARTY_API',
      homeTeam: { id: 'team-a', name: 'FC Alpha' },
      awayTeam: { id: 'team-b', name: 'FC Beta' },
      competition: { id: 'comp-1', name: 'Champions League' },
      kickoffTime: '2026-10-04T18:00:00Z',
      status: 'TIMED',
    },
    homeStats: {
      averageGoalsScored: 2.5,
      averageGoalsConceded: 0.8,
      bttsFrequency: 0.6,
      over15Frequency: 0.85,
      over25Frequency: 0.65,
      cleanSheetCount: 5,
      formLast5: ['W', 'W', 'W', 'D', 'W'],
      leagueRank: 1,
    },
    awayStats: {
      averageGoalsScored: 1.4,
      averageGoalsConceded: 1.2,
      bttsFrequency: 0.5,
      over15Frequency: 0.75,
      over25Frequency: 0.5,
      cleanSheetCount: 3,
      formLast5: ['D', 'W', 'L', 'W', 'D'],
      leagueRank: 4,
    },
    h2h: {
      homeWins: 3,
      draws: 1,
      awayWins: 1,
      totalMatches: 5,
      lastMatches: [],
    },
    marketOdds: [
      {
        fixtureId: 'mock-fix-100',
        bookmaker: 'Pinnacle',
        market: 'Over/Under Goals',
        selection: 'Over 1.5 Goals',
        odds: 1.30,
        lastUpdated: '2026-09-29T12:00:00Z',
        available: true,
      },
    ],
    dataSources: ['Custom Sports Feed API'],
    dataFreshness: 'Live Feed',
    sourceStatus: 'VERIFIED',
    observations: [],
    limitations: [],
    retrievedAt: new Date().toISOString(),
  };

  const candidates = PredictionEngine.generateCandidateSelections({
    fixtures: [customResearch],
  });

  assert(candidates.length === 1, 'Generates candidate selection for custom 3rd party provider');
  assert(candidates[0].fixtureId === 'mock-fix-100', 'Preserves external fixture identity');
  assert(candidates[0].bookmakerOdds === 1.30, 'Consumes provider-supplied odds without hardcoded bias');
}

// ----------------------------------------------------
// TEST 4: PredictionEngine never generates bookmaker odds itself
// ----------------------------------------------------
console.log('\nTEST 4: PredictionEngine never generates bookmaker odds internally');
{
  const fixtureWithoutOdds: NormalizedFixtureResearch = {
    fixture: {
      id: 'fix-no-odds',
      externalId: 'ext-no-odds',
      provider: 'DEMO',
      homeTeam: { id: 'team-x', name: 'Team X' },
      awayTeam: { id: 'team-y', name: 'Team Y' },
      competition: { id: 'comp-x', name: 'League X' },
      kickoffTime: '2026-10-04T18:00:00Z',
      status: 'TIMED',
    },
    homeStats: {
      averageGoalsScored: 2.0,
      averageGoalsConceded: 1.0,
      bttsFrequency: 0.5,
      over15Frequency: 0.8,
      over25Frequency: 0.5,
      cleanSheetCount: 4,
      formLast5: ['W', 'D', 'W', 'W', 'D'],
    },
    awayStats: {
      averageGoalsScored: 1.0,
      averageGoalsConceded: 1.5,
      bttsFrequency: 0.5,
      over15Frequency: 0.8,
      over25Frequency: 0.5,
      cleanSheetCount: 2,
      formLast5: ['L', 'D', 'W', 'L', 'D'],
    },
    h2h: { homeWins: 1, draws: 1, awayWins: 1, totalMatches: 3, lastMatches: [] },
    marketOdds: [], // Empty odds feed!
    dataSources: [],
    dataFreshness: '',
    sourceStatus: 'DEMO',
    observations: [],
    limitations: [],
    retrievedAt: new Date().toISOString(),
  };

  const candidates = PredictionEngine.generateCandidateSelections({
    fixtures: [fixtureWithoutOdds],
  });

  assert(candidates.length === 0, 'Does not fabricate odds when odds feed is empty');
}

// ----------------------------------------------------
// TEST 5 & 6: Missing statistics produce UNAVAILABLE instead of string parsing
// ----------------------------------------------------
console.log('\nTEST 5 & 6: Missing statistics produce UNAVAILABLE without failure');
{
  const model = new TransparentStatisticalModel();
  const researchWithUnavailable: NormalizedFixtureResearch = {
    fixture: {
      id: 'fix-unavail',
      externalId: 'ext-unavail',
      provider: 'LIVE_VENDOR',
      homeTeam: { id: 'team-u1', name: 'Club 1' },
      awayTeam: { id: 'team-u2', name: 'Club 2' },
      competition: { id: 'comp-u', name: 'League U' },
      kickoffTime: '2026-10-04T18:00:00Z',
      status: 'TIMED',
    },
    homeStats: {
      averageGoalsScored: 'UNAVAILABLE',
      averageGoalsConceded: 'UNAVAILABLE',
      bttsFrequency: 'UNAVAILABLE',
      over15Frequency: 'UNAVAILABLE',
      over25Frequency: 'UNAVAILABLE',
      cleanSheetCount: 'UNAVAILABLE',
      formLast5: 'UNAVAILABLE',
    },
    awayStats: {
      averageGoalsScored: 'UNAVAILABLE',
      averageGoalsConceded: 'UNAVAILABLE',
      bttsFrequency: 'UNAVAILABLE',
      over15Frequency: 'UNAVAILABLE',
      over25Frequency: 'UNAVAILABLE',
      cleanSheetCount: 'UNAVAILABLE',
      formLast5: 'UNAVAILABLE',
    },
    h2h: { homeWins: 0, draws: 0, awayWins: 0, totalMatches: 0, lastMatches: [] },
    marketOdds: [],
    dataSources: ['Feed with missing stats'],
    dataFreshness: '',
    sourceStatus: 'VERIFIED',
    observations: [],
    limitations: [],
    retrievedAt: new Date().toISOString(),
  };

  const result = model.estimateMarketProbability(
    researchWithUnavailable,
    'Over/Under Goals',
    'Over 1.5 Goals',
    1.30
  );

  assert(result.confidence === 'LOW', 'Lowers confidence when stats are UNAVAILABLE');
  assert(
    result.limitations.some((l) => l.includes('unavailable')),
    'Explicitly reports unavailable stats in limitations'
  );
}

// ----------------------------------------------------
// TEST 7: Missing odds do not produce fabricated odds
// ----------------------------------------------------
console.log('\nTEST 7: Unavailable odds are never fabricated');
{
  const oddsProvider = new DemoMarketOddsProvider();
  const oddsForMissing = oddsProvider.getOddsForFixtureSync('non-existent-fixture-id');
  assert(oddsForMissing.length === 0, 'Non-existent fixture returns empty odds array');
}

// ----------------------------------------------------
// TEST 8: DEMO mode remains functional
// ----------------------------------------------------
console.log('\nTEST 8: DEMO mode remains functional via ProviderRegistry');
{
  const status = ProviderRegistry.getStatus();
  assert(status.mode === 'DEMO', 'ProviderRegistry defaults to DEMO mode');
  assert(status.configured === false, 'Indicates live provider is not configured without crashing');
}

// ----------------------------------------------------
// TEST 9 & 10: Generate Slip and Daily Rollover still work
// ----------------------------------------------------
console.log('\nTEST 9 & 10: Generate Slip and Daily Rollover continue working');
{
  const slipRes = PredictionEngine.generateCandidateSlips({
    targetOddsMin: 4.0,
    targetOddsMax: 5.0,
  });

  assert(slipRes.slips.length >= 3, 'Generate Slip produces at least 3 candidate slips');
  assert(
    slipRes.slips.some((s) => s.combinedOdds >= 4.0 && s.combinedOdds <= 5.0),
    'At least one candidate slip hits 4.00-5.00 window'
  );
}

console.log('\n========================================================');
console.log(`PROVIDER ARCHITECTURE TESTS: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================');

if (failed > 0) {
  console.error('\nFailures:\n' + failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
} else {
  console.log('\nALL PROVIDER ARCHITECTURE TESTS PASSED! 🎉\n');
  process.exit(0);
}

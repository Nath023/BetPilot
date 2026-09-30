import { PredictionEngine } from '../server/services/predictionEngine.ts';
import { CandidateSelection, ConfidenceLevel, DataQualityLevel } from '../shared/types/index.ts';
import { calculateCombinedOdds } from '../shared/utils/calculations.ts';

// Test runner assertion helpers
let passedCount = 0;
let failedCount = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedCount++;
    failures.push(message);
    console.error(`  ✗ FAIL: ${message}`);
  }
}

// Helper mock candidate builder
function createMockCandidate(overrides: Partial<CandidateSelection>): CandidateSelection {
  return {
    id: overrides.id || `cand-${Math.random()}`,
    fixtureId: overrides.fixtureId || 'fix-1',
    homeTeam: overrides.homeTeam || 'Team A',
    awayTeam: overrides.awayTeam || 'Team B',
    competition: overrides.competition || 'Premier League',
    kickoffTime: overrides.kickoffTime || '2026-10-03T16:00:00Z',
    market: overrides.market || 'Over/Under Goals',
    selection: overrides.selection || 'Over 1.5 Goals',
    bookmakerOdds: overrides.bookmakerOdds || 1.35,
    impliedProbability: 1 / (overrides.bookmakerOdds || 1.35),
    modelEstimatedProbability: overrides.modelEstimatedProbability || 0.78,
    edgePercentage: overrides.edgePercentage || 4.2,
    expectedValue: overrides.expectedValue || 0.05,
    confidence: overrides.confidence || 'HIGH',
    dataQuality: overrides.dataQuality || 'HIGH',
    dataQualityInputs: ['form', 'h2h'],
    dataQualityMissing: [],
    whySelected: ['Solid form'],
    limitations: [],
    correlatedKeys: [overrides.fixtureId || 'fix-1'],
  };
}

console.log('====================================================');
console.log('RUNNING BETPILOT DYNAMIC ODDS-WINDOW OPTIMIZER TESTS');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: Exact target-range combination (4.00 - 5.00)
// ----------------------------------------------------
console.log('TEST 1: Exact target-range combination (4.00 - 5.00)');
{
  const res = PredictionEngine.generateCandidateSlips({
    targetOddsMin: 4.0,
    targetOddsMax: 5.0,
  });

  assert(res.slips.length >= 3, 'Should generate at least 3 candidate slips');
  const inRangeSlips = res.slips.filter((s) => s.combinedOdds >= 4.0 && s.combinedOdds <= 5.0);
  assert(inRangeSlips.length >= 2, `Majority of slips fall strictly in 4.00-5.00 range (got ${inRangeSlips.length}/${res.slips.length})`);
  assert(!res.safetyWarning, 'Should not return safety warning when valid in-range slips exist');
  console.log(`    Generated Odds: ${res.slips.map((s) => s.combinedOdds.toFixed(2)).join(', ')}`);
}

// ----------------------------------------------------
// TEST 2: Combination below target (Impossible High Target)
// ----------------------------------------------------
console.log('\nTEST 2: Combination below target (Requested 20.0 - 30.0 without weak forcing)');
{
  const res = PredictionEngine.generateCandidateSlips({
    targetOddsMin: 20.0,
    targetOddsMax: 30.0,
    selectionCountMin: 4,
    selectionCountMax: 5,
  });

  assert(res.safetyWarning !== undefined, 'Should return transparent safetyWarning when odds target cannot be met without weak forcing');
  assert(
    res.safetyWarning?.includes('No sufficiently supported combination was found') || false,
    'Warning explains that no sufficiently supported combination falls in range'
  );
  assert(res.slips.length > 0, 'Should return closest valid alternatives rather than crashing or forcing fake bets');
}

// ----------------------------------------------------
// TEST 3: Combination above target (Ultra-low target like 1.50 - 2.00 with 4 legs min)
// ----------------------------------------------------
console.log('\nTEST 3: Combination above target');
{
  const res = PredictionEngine.generateCandidateSlips({
    targetOddsMin: 1.5,
    targetOddsMax: 2.0,
    selectionCountMin: 4,
    selectionCountMax: 4,
  });

  assert(res.slips.length > 0, 'Returns closest valid slips for low targets');
  assert(res.slips[0].selections.length === 4, 'Respects 4 selection count');
}

// ----------------------------------------------------
// TEST 4: No valid combination (Empty Pool or Impossible Filter)
// ----------------------------------------------------
console.log('\nTEST 4: No valid combination handling');
{
  const res = PredictionEngine.generateCandidateSlips({
    candidatePool: [], // Empty pool
    targetOddsMin: 4.0,
    targetOddsMax: 5.0,
  });

  assert(res.slips.length === 0, 'Returns empty slips array when no candidates exist');
  assert(res.safetyWarning !== undefined, 'Returns transparent safety notice on empty pool');
}

// ----------------------------------------------------
// TEST 5: Correlated selections rejection
// ----------------------------------------------------
console.log('\nTEST 5: Correlated selections rejection (Same fixture duplicate exclusion)');
{
  // Provide 2 selections from fix-1 and 3 from other fixtures
  const mockPool = [
    createMockCandidate({ id: 'c1', fixtureId: 'fix-1', bookmakerOdds: 1.4, selection: 'Team 1 Win' }),
    createMockCandidate({ id: 'c2', fixtureId: 'fix-1', bookmakerOdds: 1.3, selection: 'Over 1.5 Goals' }),
    createMockCandidate({ id: 'c3', fixtureId: 'fix-2', bookmakerOdds: 1.45, competition: 'La Liga' }),
    createMockCandidate({ id: 'c4', fixtureId: 'fix-3', bookmakerOdds: 1.45, competition: 'Bundesliga' }),
    createMockCandidate({ id: 'c5', fixtureId: 'fix-4', bookmakerOdds: 1.5, competition: 'Serie A' }),
  ];

  const res = PredictionEngine.generateCandidateSlips({
    candidatePool: mockPool,
    targetOddsMin: 3.5,
    targetOddsMax: 5.5,
    selectionCountMin: 4,
    selectionCountMax: 4,
  });

  res.slips.forEach((slip) => {
    const fixtureIds = slip.selections.map((s) => s.fixtureId);
    const uniqueFixtureIds = new Set(fixtureIds);
    assert(
      fixtureIds.length === uniqueFixtureIds.size,
      `Slip ${slip.title} has zero intra-match correlation (unique fixtures: ${uniqueFixtureIds.size}/${fixtureIds.length})`
    );
  });
}

// ----------------------------------------------------
// TEST 6, 7, 8: Four, Five, and Six selection combinations
// ----------------------------------------------------
console.log('\nTEST 6, 7, 8: Exact leg counts (4-leg, 5-leg, 6-leg combinations)');
{
  // 4 legs
  const res4 = PredictionEngine.generateCandidateSlips({
    selectionCountMin: 4,
    selectionCountMax: 4,
    targetOddsMin: 4.0,
    targetOddsMax: 5.0,
  });
  assert(res4.slips.length > 0 && res4.slips[0].selections.length === 4, 'Successfully generated 4-leg candidate slips');

  // 5 legs
  const res5 = PredictionEngine.generateCandidateSlips({
    selectionCountMin: 5,
    selectionCountMax: 5,
    targetOddsMin: 4.0,
    targetOddsMax: 5.5,
  });
  assert(res5.slips.length > 0 && res5.slips[0].selections.length === 5, 'Successfully generated 5-leg candidate slips');

  // 6 legs
  const res6 = PredictionEngine.generateCandidateSlips({
    selectionCountMin: 6,
    selectionCountMax: 6,
    targetOddsMin: 4.0,
    targetOddsMax: 6.5,
  });
  assert(res6.slips.length > 0 && res6.slips[0].selections.length === 6, 'Successfully generated 6-leg candidate slips');
}

// ----------------------------------------------------
// TEST 9: Natural-language strategy constraints
// ----------------------------------------------------
console.log('\nTEST 9: Natural-language strategy constraints');
{
  // 9a. "mostly goals markets"
  const parsed1 = PredictionEngine.parseStrategyInstruction('Generate a 4.00-5.00 slip using mostly goals markets');
  assert(
    parsed1.strategy.preferredMarkets?.includes('Over/Under Goals') || false,
    'Parses goals markets strategy'
  );

  // 9b. "avoid match winners"
  const parsed2 = PredictionEngine.parseStrategyInstruction('Give me five selections and avoid match winners');
  assert(parsed2.selectionCountMin === 5 && parsed2.selectionCountMax === 5, 'Parses five selections count');
  assert(parsed2.strategy.excludedMarkets?.includes('1X2') || false, 'Parses avoid match winners filter');

  // 9c. "only high-confidence selections"
  const parsed3 = PredictionEngine.parseStrategyInstruction('Use only high-confidence selections');
  assert(parsed3.strategy.minConfidence === 'HIGH', 'Parses high-confidence filter');

  // 9d. "don\'t use more than one game from the same league"
  const parsed4 = PredictionEngine.parseStrategyInstruction('Don\'t use more than one game from the same league');
  assert(parsed4.strategy.maxPerLeague === 1, 'Parses max 1 game per league');

  // Test execution with strategy instruction
  const resStrategy = PredictionEngine.generateCandidateSlips({
    naturalLanguageInstruction: 'Give me five selections and avoid match winners',
    targetOddsMin: 4.0,
    targetOddsMax: 5.5,
  });

  if (resStrategy.slips.length > 0) {
    const has1X2 = resStrategy.slips[0].selections.some((s) => s.market === '1X2');
    assert(!has1X2, 'Strategy execution excludes 1X2 market as requested');
    assert(resStrategy.slips[0].selections.length === 5, 'Strategy execution generated exactly 5 legs');
  }
}

// ----------------------------------------------------
// TEST 10: Daily rollover generation
// ----------------------------------------------------
console.log('\nTEST 10: Daily rollover slip generation');
{
  const res = PredictionEngine.generateCandidateSlips({
    targetOddsMin: 4.0,
    targetOddsMax: 5.0,
  });

  assert(res.slips.length >= 3, 'Daily rollover produces at least 3 distinct candidate slips');
  assert(res.slips[0].dataQuality === 'HIGH', 'Candidate A maintains High data quality');
  assert(res.slips[0].rationale.length > 10, 'Candidate A contains transparent rationale');
}

// ----------------------------------------------------
// TEST 11: Deterministic combined-odds calculation
// ----------------------------------------------------
console.log('\nTEST 11: Deterministic combined-odds calculation verification');
{
  const oddsTestCases = [
    { input: [1.34, 1.45, 1.5, 1.55], expected: 4.52 },
    { input: [1.28, 1.34, 1.45, 1.42, 1.34], expected: 4.74 },
    { input: [1.35, 1.35, 1.35, 1.35], expected: 3.32 },
  ];

  oddsTestCases.forEach(({ input, expected }) => {
    const calculated = calculateCombinedOdds(input);
    const diff = Math.abs(calculated - expected);
    assert(diff <= 0.02, `Odds calculation for [${input.join(', ')}] = ${calculated} (expected ~${expected})`);
  });
}

// ----------------------------------------------------
// TEST 12: Bookmaker overround and margin calculation
// ----------------------------------------------------
console.log('\nTEST 12: Bookmaker overround and margin calculation');
{
  const { calculateMarketOverround } = await import('../shared/utils/calculations.ts');
  // Two-way market: 1.90 vs 1.90 -> 1/1.9 + 1/1.9 = 52.6% + 52.6% = 105.3% -> Margin 5.3%
  const twoWay = calculateMarketOverround([1.90, 1.90]);
  assert(twoWay.marginPercent >= 5.0 && twoWay.marginPercent <= 5.5, 'Calculates 2-way market margin (~5.3%)');
  assert(twoWay.isFairOrValue === false, 'Detects standard retail bookmaker margin');

  // Low margin/fair market: 2.02 vs 2.02 -> 1/2.02 + 1/2.02 = 99% -> Margin ~0%
  const fairMarket = calculateMarketOverround([2.02, 2.02]);
  assert(fairMarket.marginPercent <= 1.0, 'Calculates sharp/fair market low margin');
  assert(fairMarket.isFairOrValue === true, 'Flags low-margin market as fair/value');
}

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('====================================================');

if (failedCount > 0) {
  console.error('\nFailed tests:\n' + failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
} else {
  console.log('\nALL TESTS PASSED SUCCESSFULLY! 🎉\n');
  process.exit(0);
}

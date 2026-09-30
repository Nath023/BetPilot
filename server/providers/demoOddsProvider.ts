import { IMarketOddsProvider } from './sportsProviderTypes.ts';
import { NormalizedMarketOdds, ProviderMode } from '../../shared/types/index.ts';
import { DEMO_RESEARCH_FIXTURES } from '../../shared/constants/demoData.ts';

/**
 * DemoMarketOddsProvider: Provides deterministic decimal odds for demo fixtures.
 * Decouples market odds from the prediction engine so odds originate from an odds provider.
 */
export class DemoMarketOddsProvider implements IMarketOddsProvider {
  public readonly providerName = 'Demo Market Odds Provider';
  public readonly mode: ProviderMode = 'DEMO';

  public isConfigured(): boolean {
    return true;
  }

  public getOddsForFixtureSync(fixtureId: string): NormalizedMarketOdds[] {
    const fixture = DEMO_RESEARCH_FIXTURES[fixtureId];
    if (!fixture) return [];

    const now = new Date().toISOString();
    const oddsList: NormalizedMarketOdds[] = [];

    // 1. Over/Under Goals (Over 1.5 Goals)
    oddsList.push({
      fixtureId,
      bookmaker: 'Demo Sportsbook',
      market: 'Over/Under Goals',
      selection: 'Over 1.5 Goals',
      odds: 1.28,
      lastUpdated: now,
      available: true,
    });

    // 2. Double Chance (1X)
    oddsList.push({
      fixtureId,
      bookmaker: 'Demo Sportsbook',
      market: 'Double Chance',
      selection: `${fixture.homeTeam} or Draw (1X)`,
      odds: 1.34,
      lastUpdated: now,
      available: true,
    });

    // 3. Both Teams to Score (Derby / High BTTS fixtures)
    if (fixtureId === 'fix-3' || fixtureId === 'fix-5') {
      oddsList.push({
        fixtureId,
        bookmaker: 'Demo Sportsbook',
        market: 'Both Teams to Score',
        selection: 'Both Teams to Score - Yes (GG)',
        odds: 1.55,
        lastUpdated: now,
        available: true,
      });
    }

    // 4. Match Result (1X2 Home Win for top home favorites)
    const homeRank = fixture.standings?.homeRank ?? 2;
    const awayRank = fixture.standings?.awayRank ?? 10;
    if (homeRank <= 3 && awayRank >= 4) {
      oddsList.push({
        fixtureId,
        bookmaker: 'Demo Sportsbook',
        market: '1X2',
        selection: `${fixture.homeTeam} Win`,
        odds: 1.45,
        lastUpdated: now,
        available: true,
      });
    }

    return oddsList;
  }

  public async getOddsForFixture(fixtureId: string): Promise<NormalizedMarketOdds[]> {
    return this.getOddsForFixtureSync(fixtureId);
  }

  public async getAllOdds(): Promise<Map<string, NormalizedMarketOdds[]>> {
    const oddsMap = new Map<string, NormalizedMarketOdds[]>();
    for (const fId of Object.keys(DEMO_RESEARCH_FIXTURES)) {
      const odds = await this.getOddsForFixture(fId);
      oddsMap.set(fId, odds);
    }
    return oddsMap;
  }
}

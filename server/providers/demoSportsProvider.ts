import { ISportsDataProvider } from './sportsProviderTypes.ts';
import {
  NormalizedFixture,
  NormalizedFixtureResearch,
  NormalizedTeamStats,
  NormalizedH2H,
  ProviderMode,
} from '../../shared/types/index.ts';
import { DEMO_RESEARCH_FIXTURES } from '../../shared/constants/demoData.ts';
import { DemoMarketOddsProvider } from './demoOddsProvider.ts';

export class DemoSportsDataProvider implements ISportsDataProvider {
  public readonly providerName = 'Curated Benchmark Fixtures (DEMO)';
  public readonly mode: ProviderMode = 'DEMO';
  private oddsProvider = new DemoMarketOddsProvider();

  public isConfigured(): boolean {
    return true;
  }

  private parseStats(rawFixture: any, side: 'home' | 'away'): NormalizedTeamStats {
    const isHome = side === 'home';
    const form = isHome ? rawFixture.homeForm : rawFixture.awayForm;
    const rank = isHome ? rawFixture.standings?.homeRank : rawFixture.standings?.awayRank;

    const stats = rawFixture.statistics || [];
    const getStat = (name: string): string => {
      const s = stats.find((item: any) => item.label.toLowerCase().includes(name.toLowerCase()));
      return s ? (isHome ? s.homeValue : s.awayValue) : '';
    };

    const avgScoredStr = getStat('Avg Goals Scored');
    const avgConcededStr = getStat('Avg Goals Conceded');
    const bttsStr = getStat('Both Teams');
    const over15Str = getStat('Over 1.5');
    const cleanSheetsStr = getStat('Clean Sheets');

    return {
      averageGoalsScored: avgScoredStr ? parseFloat(avgScoredStr) : (isHome ? 2.0 : 1.2),
      averageGoalsConceded: avgConcededStr ? parseFloat(avgConcededStr) : (isHome ? 0.8 : 1.4),
      bttsFrequency: bttsStr ? parseFloat(bttsStr.replace('%', '')) / 100 : 0.5,
      over15Frequency: over15Str ? parseFloat(over15Str.replace('%', '')) / 100 : 0.8,
      over25Frequency: 0.55,
      cleanSheetCount: cleanSheetsStr ? parseInt(cleanSheetsStr, 10) : 4,
      formLast5: form || ['W', 'D', 'W', 'W', 'D'],
      leagueRank: typeof rank === 'number' ? rank : (isHome ? 3 : 10),
      isFallbackDemoValue: false,
    };
  }

  public async getUpcomingFixtures(date?: string): Promise<NormalizedFixture[]> {
    const all = await this.getAllFixtureResearch();
    if (!date) return all.map((r) => r.fixture);
    return all
      .map((r) => r.fixture)
      .filter((f) => f.kickoffTime.startsWith(date));
  }

  public adaptToNormalizedSync(raw: any): NormalizedFixtureResearch {
    const homeStats = this.parseStats(raw, 'home');
    const awayStats = this.parseStats(raw, 'away');
    const odds = this.oddsProvider.getOddsForFixtureSync(raw.fixtureId);

    const fixture: NormalizedFixture = {
      id: raw.fixtureId,
      externalId: `demo-${raw.fixtureId}`,
      provider: 'DEMO',
      homeTeam: {
        id: `team-${raw.homeTeam.toLowerCase().replace(/\s+/g, '-')}`,
        name: raw.homeTeam,
      },
      awayTeam: {
        id: `team-${raw.awayTeam.toLowerCase().replace(/\s+/g, '-')}`,
        name: raw.awayTeam,
      },
      competition: {
        id: `comp-${raw.competition.toLowerCase().replace(/\s+/g, '-')}`,
        name: raw.competition,
      },
      kickoffTime: raw.kickoffTime || '2026-10-03T16:00:00Z',
      status: 'TIMED',
    };

    const h2h: NormalizedH2H = {
      homeWins: raw.headToHead?.homeWins ?? 2,
      draws: raw.headToHead?.draws ?? 1,
      awayWins: raw.headToHead?.awayWins ?? 1,
      totalMatches:
        (raw.headToHead?.homeWins ?? 2) +
        (raw.headToHead?.draws ?? 1) +
        (raw.headToHead?.awayWins ?? 1),
      lastMatches: raw.headToHead?.lastMatches ?? [],
    };

    return {
      fixture,
      homeStats,
      awayStats,
      h2h,
      standings: raw.standings
        ? {
            homeRank: raw.standings.homeRank,
            awayRank: raw.standings.awayRank,
            homePoints: raw.standings.homePoints,
            awayPoints: raw.standings.awayPoints,
          }
        : undefined,
      injuries: raw.injuries || 'UNAVAILABLE',
      lineups: 'UNAVAILABLE',
      marketOdds: odds,
      dataSources: ['Curated Historical Match Database (DEMO)'],
      dataFreshness: raw.dataFreshness || '2026-09-28 Snapshot',
      sourceStatus: 'DEMO',
      observations: raw.observations || [],
      limitations: [
        ...(raw.limitations || []),
        'Operating in DEMO mode with verified benchmark data.',
      ],
      retrievedAt: new Date().toISOString(),
    };
  }

  public getAllFixtureResearchSync(): NormalizedFixtureResearch[] {
    return Object.values(DEMO_RESEARCH_FIXTURES).map((raw) => this.adaptToNormalizedSync(raw));
  }

  public async getAllFixtureResearch(): Promise<NormalizedFixtureResearch[]> {
    return this.getAllFixtureResearchSync();
  }

  public async getFixtureResearch(
    homeTeam: string,
    awayTeam: string
  ): Promise<NormalizedFixtureResearch | null> {
    const homeClean = (homeTeam || '').toLowerCase().trim();
    const awayClean = (awayTeam || '').toLowerCase().trim();

    const rawMatch = Object.values(DEMO_RESEARCH_FIXTURES).find(
      (f) =>
        (f.homeTeam.toLowerCase().includes(homeClean) || homeClean.includes(f.homeTeam.toLowerCase())) &&
        (f.awayTeam.toLowerCase().includes(awayClean) || awayClean.includes(f.awayTeam.toLowerCase()))
    );

    if (!rawMatch) return null;
    return this.adaptToNormalizedSync(rawMatch);
  }

  public async getTeamStandings(competitionId: string): Promise<Map<string, number>> {
    const standingsMap = new Map<string, number>();
    for (const raw of Object.values(DEMO_RESEARCH_FIXTURES)) {
      if (raw.standings) {
        standingsMap.set(raw.homeTeam, raw.standings.homeRank);
        standingsMap.set(raw.awayTeam, raw.standings.awayRank);
      }
    }
    return standingsMap;
  }

  private async adaptToNormalized(raw: any): Promise<NormalizedFixtureResearch> {
    const homeStats = this.parseStats(raw, 'home');
    const awayStats = this.parseStats(raw, 'away');
    const odds = await this.oddsProvider.getOddsForFixture(raw.fixtureId);

    const fixture: NormalizedFixture = {
      id: raw.fixtureId,
      externalId: `demo-${raw.fixtureId}`,
      provider: 'DEMO',
      homeTeam: {
        id: `team-${raw.homeTeam.toLowerCase().replace(/\s+/g, '-')}`,
        name: raw.homeTeam,
      },
      awayTeam: {
        id: `team-${raw.awayTeam.toLowerCase().replace(/\s+/g, '-')}`,
        name: raw.awayTeam,
      },
      competition: {
        id: `comp-${raw.competition.toLowerCase().replace(/\s+/g, '-')}`,
        name: raw.competition,
      },
      kickoffTime: raw.kickoffTime || '2026-10-03T16:00:00Z',
      status: 'TIMED',
    };

    const h2h: NormalizedH2H = {
      homeWins: raw.headToHead?.homeWins ?? 2,
      draws: raw.headToHead?.draws ?? 1,
      awayWins: raw.headToHead?.awayWins ?? 1,
      totalMatches:
        (raw.headToHead?.homeWins ?? 2) +
        (raw.headToHead?.draws ?? 1) +
        (raw.headToHead?.awayWins ?? 1),
      lastMatches: raw.headToHead?.lastMatches ?? [],
    };

    return {
      fixture,
      homeStats,
      awayStats,
      h2h,
      standings: raw.standings
        ? {
            homeRank: raw.standings.homeRank,
            awayRank: raw.standings.awayRank,
            homePoints: raw.standings.homePoints,
            awayPoints: raw.standings.awayPoints,
          }
        : undefined,
      injuries: raw.injuries || 'UNAVAILABLE',
      lineups: 'UNAVAILABLE',
      marketOdds: odds,
      dataSources: ['Curated Historical Match Database (DEMO)'],
      dataFreshness: raw.dataFreshness || '2026-09-28 Snapshot',
      sourceStatus: 'DEMO',
      observations: raw.observations || [],
      limitations: [
        ...(raw.limitations || []),
        'Operating in DEMO mode with verified benchmark data.',
      ],
      retrievedAt: new Date().toISOString(),
    };
  }
}

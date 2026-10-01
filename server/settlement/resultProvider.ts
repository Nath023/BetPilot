import { NormalizedMatchResult } from '../../shared/types/index.ts';
import { ProviderRegistry } from '../providers/providerRegistry.ts';
import { TeamAliasResolver } from '../providers/teamAliasResolver.ts';

/**
 * Benchmark match results for curated fixtures in Demo mode.
 * Provides realistic outcomes including wins, losses, draws, and postponed matches.
 */
export const BENCHMARK_MATCH_RESULTS: NormalizedMatchResult[] = [
  {
    fixtureId: 'fix-1',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    competition: 'Premier League',
    status: 'FINISHED',
    score: { home: 2, away: 1, htHome: 1, htAway: 0 },
    finishedAt: '2026-10-03T18:25:00Z',
    provider: 'Curated Benchmark Results',
  },
  {
    fixtureId: 'fix-2',
    homeTeam: 'Real Madrid',
    awayTeam: 'Sevilla',
    competition: 'La Liga',
    status: 'FINISHED',
    score: { home: 2, away: 0, htHome: 1, htAway: 0 },
    finishedAt: '2026-10-03T21:55:00Z',
    provider: 'Curated Benchmark Results',
  },
  {
    fixtureId: 'fix-3',
    homeTeam: 'Inter Milan',
    awayTeam: 'Roma',
    competition: 'Serie A',
    status: 'FINISHED',
    score: { home: 1, away: 1, htHome: 0, htAway: 1 },
    finishedAt: '2026-10-04T18:55:00Z',
    provider: 'Curated Benchmark Results',
  },
  {
    fixtureId: 'fix-4',
    homeTeam: 'Bayern Munich',
    awayTeam: 'Borussia Dortmund',
    competition: 'Bundesliga',
    status: 'FINISHED',
    score: { home: 3, away: 2, htHome: 2, htAway: 1 },
    finishedAt: '2026-10-04T20:25:00Z',
    provider: 'Curated Benchmark Results',
  },
  {
    fixtureId: 'fix-5',
    homeTeam: 'Barcelona',
    awayTeam: 'Atletico Madrid',
    competition: 'La Liga',
    status: 'FINISHED',
    score: { home: 1, away: 0, htHome: 0, htAway: 0 },
    finishedAt: '2026-10-04T22:50:00Z',
    provider: 'Curated Benchmark Results',
  },
  {
    fixtureId: 'fix-6',
    homeTeam: 'Paris Saint-Germain',
    awayTeam: 'Lyon',
    competition: 'Ligue 1',
    status: 'FINISHED',
    score: { home: 3, away: 1, htHome: 1, htAway: 0 },
    finishedAt: '2026-10-04T22:45:00Z',
    provider: 'Curated Benchmark Results',
  },
  {
    fixtureId: 'fix-7',
    homeTeam: 'Liverpool',
    awayTeam: 'Everton',
    competition: 'Premier League',
    status: 'POSTPONED',
    score: { home: null, away: null },
    finishedAt: '2026-10-03T11:00:00Z',
    provider: 'Curated Benchmark Results',
  },
  {
    fixtureId: 'fix-8',
    homeTeam: 'Manchester City',
    awayTeam: 'Tottenham',
    competition: 'Premier League',
    status: 'FINISHED',
    score: { home: 4, away: 1, htHome: 2, htAway: 0 },
    finishedAt: '2026-10-04T19:25:00Z',
    provider: 'Curated Benchmark Results',
  },
];

/**
 * ResultProvider: Unified result retrieval service that ingests results
 * from active sports data providers with in-memory caching and manual override support.
 */
export class ResultProvider {
  private static customResults: Map<string, NormalizedMatchResult> = new Map();

  /**
   * Register or override a verified match result (e.g. from user input or manual verification)
   */
  public static setManualResult(result: NormalizedMatchResult): void {
    const key = result.fixtureId || `${result.homeTeam.toLowerCase()}_${result.awayTeam.toLowerCase()}`;
    this.customResults.set(key, result);
  }

  /**
   * Clear all manual overrides
   */
  public static clearManualResults(): void {
    this.customResults.clear();
  }

  /**
   * Look up result by fixtureId or team names
   */
  public static async getMatchResult(
    fixtureId?: string,
    homeTeam?: string,
    awayTeam?: string
  ): Promise<NormalizedMatchResult | null> {
    // 1. Check custom overrides first
    if (fixtureId && this.customResults.has(fixtureId)) {
      return this.customResults.get(fixtureId)!;
    }

    if (homeTeam && awayTeam) {
      for (const res of this.customResults.values()) {
        if (
          TeamAliasResolver.matches(res.homeTeam, homeTeam) &&
          TeamAliasResolver.matches(res.awayTeam, awayTeam)
        ) {
          return res;
        }
      }
    }

    // 2. Check Curated Benchmark Results
    if (fixtureId) {
      const match = BENCHMARK_MATCH_RESULTS.find((r) => r.fixtureId === fixtureId);
      if (match) return match;
    }

    if (homeTeam && awayTeam) {
      const match = BENCHMARK_MATCH_RESULTS.find(
        (r) =>
          TeamAliasResolver.matches(r.homeTeam, homeTeam) &&
          TeamAliasResolver.matches(r.awayTeam, awayTeam)
      );
      if (match) return match;
    }

    // 3. Fallback: Check if live sports provider has results (when configured)
    const activeProvider = ProviderRegistry.getSportsProvider();
    if (activeProvider.isConfigured() && activeProvider.mode === 'LIVE') {
      try {
        const fixtures = await activeProvider.getUpcomingFixtures();
        const found = fixtures.find(
          (f) =>
            (fixtureId && f.id === fixtureId) ||
            (homeTeam && awayTeam && TeamAliasResolver.matches(f.homeTeam.name, homeTeam) && TeamAliasResolver.matches(f.awayTeam.name, awayTeam))
        );
        if (found && (found as any).score) {
          const rawScore = (found as any).score;
          return {
            fixtureId: found.id,
            homeTeam: found.homeTeam.name,
            awayTeam: found.awayTeam.name,
            competition: found.competition.name,
            status: found.status === 'FINISHED' ? 'FINISHED' : 'LIVE',
            score: {
              home: rawScore.fullTime?.home ?? rawScore.home ?? null,
              away: rawScore.fullTime?.away ?? rawScore.away ?? null,
            },
            provider: activeProvider.providerName,
          };
        }
      } catch (e) {
        console.warn('Failed to query live match results from provider:', e);
      }
    }

    return null;
  }

  /**
   * Return all currently known match results
   */
  public static async getAllResults(): Promise<NormalizedMatchResult[]> {
    const list = [...BENCHMARK_MATCH_RESULTS];
    this.customResults.forEach((res) => {
      const idx = list.findIndex((r) => r.fixtureId === res.fixtureId);
      if (idx >= 0) {
        list[idx] = res;
      } else {
        list.push(res);
      }
    });
    return list;
  }
}

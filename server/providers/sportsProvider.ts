import { ResearchResult, NormalizedFixtureResearch } from '../../shared/types/index.ts';
import { ProviderRegistry } from './providerRegistry.ts';

/**
 * SportsDataProvider: Bridge class that interfaces with the active provider from ProviderRegistry.
 * Maintains backwards compatibility while forwarding all requests to normalized provider instances.
 */
export class SportsDataProvider {
  public static isConnected(): boolean {
    return ProviderRegistry.getStatus().configured;
  }

  public static getStatus() {
    return ProviderRegistry.getStatus();
  }

  public static async searchFixtures(query: string): Promise<NormalizedFixtureResearch[]> {
    const q = (query || '').toLowerCase().trim();
    const provider = ProviderRegistry.getSportsProvider();
    const all = await provider.getAllFixtureResearch();
    if (!q) return all;

    return all.filter((f) =>
      f.fixture.homeTeam.name.toLowerCase().includes(q) ||
      f.fixture.awayTeam.name.toLowerCase().includes(q) ||
      f.fixture.competition.name.toLowerCase().includes(q)
    );
  }

  public static async getFixtureResearch(
    homeTeam: string,
    awayTeam: string,
    _competition?: string
  ): Promise<{
    found: boolean;
    result?: NormalizedFixtureResearch;
    message?: string;
  }> {
    const provider = ProviderRegistry.getSportsProvider();
    const result = await provider.getFixtureResearch(homeTeam, awayTeam);

    if (result) {
      return {
        found: true,
        result,
      };
    }

    return {
      found: false,
      message: `No verified sports statistics or head-to-head records found for ${homeTeam} vs ${awayTeam}. Sports provider is currently operating in ${provider.mode} mode.`,
    };
  }
}

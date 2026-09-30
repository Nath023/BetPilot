import { NormalizedFixtureResearch } from '../../shared/types/index.ts';
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

  public static async searchFixtures(query: string): Promise<any[]> {
    const q = (query || '').toLowerCase().trim();
    const provider = ProviderRegistry.getSportsProvider();
    const all = await provider.getAllFixtureResearch();
    const filtered = !q
      ? all
      : all.filter(
          (f) =>
            f.fixture.homeTeam.name.toLowerCase().includes(q) ||
            f.fixture.awayTeam.name.toLowerCase().includes(q) ||
            f.fixture.competition.name.toLowerCase().includes(q)
        );

    // Format with top-level convenience properties for backwards UI compatibility
    return filtered.map((item) => ({
      ...item,
      fixtureId: item.fixture.id,
      homeTeam: item.fixture.homeTeam.name,
      awayTeam: item.fixture.awayTeam.name,
      competition: item.fixture.competition.name,
      kickoffTime: item.fixture.kickoffTime,
      homeForm: Array.isArray(item.homeStats.formLast5) ? item.homeStats.formLast5 : ['W', 'D', 'W', 'W', 'D'],
      awayForm: Array.isArray(item.awayStats.formLast5) ? item.awayStats.formLast5 : ['D', 'W', 'L', 'W', 'D'],
      headToHead: item.h2h,
      statistics: [
        {
          label: 'Avg Goals Scored / Match',
          homeValue: String(item.homeStats.averageGoalsScored),
          awayValue: String(item.awayStats.averageGoalsScored),
        },
        {
          label: 'Avg Goals Conceded',
          homeValue: String(item.homeStats.averageGoalsConceded),
          awayValue: String(item.awayStats.averageGoalsConceded),
        },
        {
          label: 'Clean Sheets (Last 10)',
          homeValue: String(item.homeStats.cleanSheetCount),
          awayValue: String(item.awayStats.cleanSheetCount),
        },
        {
          label: 'Both Teams Scored %',
          homeValue: `${Math.round(Number(item.homeStats.bttsFrequency || 0.5) * 100)}%`,
          awayValue: `${Math.round(Number(item.awayStats.bttsFrequency || 0.5) * 100)}%`,
        },
        {
          label: 'Over 1.5 Goals Rate',
          homeValue: `${Math.round(Number(item.homeStats.over15Frequency || 0.8) * 100)}%`,
          awayValue: `${Math.round(Number(item.awayStats.over15Frequency || 0.8) * 100)}%`,
        },
      ],
    }));
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

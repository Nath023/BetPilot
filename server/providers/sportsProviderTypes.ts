import {
  NormalizedFixture,
  NormalizedFixtureResearch,
  NormalizedMarketOdds,
  ProviderMode,
} from '../../shared/types/index.ts';

export interface SportsProviderStatus {
  mode: ProviderMode;
  sportsProvider: string;
  oddsProvider: string;
  configured: boolean;
  liveDataAvailable: boolean;
  freshness: string;
  limitations: string[];
}

export interface ISportsDataProvider {
  readonly providerName: string;
  readonly mode: ProviderMode;
  isConfigured(): boolean;
  getUpcomingFixtures(date?: string): Promise<NormalizedFixture[]>;
  getFixtureResearch(homeTeam: string, awayTeam: string): Promise<NormalizedFixtureResearch | null>;
  getAllFixtureResearch(): Promise<NormalizedFixtureResearch[]>;
  getTeamStandings(competitionId: string): Promise<Map<string, number>>;
}

export interface IMarketOddsProvider {
  readonly providerName: string;
  readonly mode: ProviderMode;
  isConfigured(): boolean;
  getOddsForFixture(fixtureId: string): Promise<NormalizedMarketOdds[]>;
  getAllOdds(): Promise<Map<string, NormalizedMarketOdds[]>>;
}

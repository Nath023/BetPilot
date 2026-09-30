import {
  ISportsDataProvider,
  IMarketOddsProvider,
  SportsProviderStatus,
} from './sportsProviderTypes.ts';
import { DemoSportsDataProvider } from './demoSportsProvider.ts';
import { DemoMarketOddsProvider } from './demoOddsProvider.ts';
import { LiveSportsProvider } from './liveSportsProvider.ts';

/**
 * ProviderRegistry: Manages active sports-data and market-odds providers.
 * Provides abstraction boundary so prediction engine and app are 100% vendor-agnostic.
 * Automatically switches to LiveSportsProvider when SPORTS_DATA_API_KEY is configured.
 */
export class ProviderRegistry {
  private static liveProvider = new LiveSportsProvider();
  private static sportsProvider: ISportsDataProvider =
    process.env.SPORTS_DATA_API_KEY ? ProviderRegistry.liveProvider : new DemoSportsDataProvider();
  private static oddsProvider: IMarketOddsProvider =
    process.env.SPORTS_DATA_API_KEY ? ProviderRegistry.liveProvider : new DemoMarketOddsProvider();

  public static getSportsProvider(): ISportsDataProvider {
    if (process.env.SPORTS_DATA_API_KEY && this.sportsProvider instanceof DemoSportsDataProvider) {
      this.sportsProvider = this.liveProvider;
      this.oddsProvider = this.liveProvider;
    }
    return this.sportsProvider;
  }

  public static setSportsProvider(provider: ISportsDataProvider): void {
    this.sportsProvider = provider;
  }

  public static getOddsProvider(): IMarketOddsProvider {
    if (process.env.SPORTS_DATA_API_KEY && this.oddsProvider instanceof DemoMarketOddsProvider) {
      this.sportsProvider = this.liveProvider;
      this.oddsProvider = this.liveProvider;
    }
    return this.oddsProvider;
  }

  public static setOddsProvider(provider: IMarketOddsProvider): void {
    this.oddsProvider = provider;
  }

  public static getStatus(): SportsProviderStatus {
    const activeSports = this.getSportsProvider();
    const activeOdds = this.getOddsProvider();
    const isLiveConfigured = activeSports.mode === 'LIVE' && activeSports.isConfigured();

    return {
      mode: isLiveConfigured ? 'LIVE' : 'DEMO',
      sportsProvider: activeSports.providerName,
      oddsProvider: activeOdds.providerName,
      configured: isLiveConfigured,
      liveDataAvailable: isLiveConfigured,
      freshness: isLiveConfigured ? 'Live Provider Feed' : 'Static Curated Benchmark Snapshot (DEMO MODE)',
      limitations: isLiveConfigured
        ? []
        : [
            'Running in DEMO mode with curated benchmark fixtures.',
            'Never fabricates live odds or real-time injuries.',
            'Connect a sports API key in environment to switch to LIVE mode.',
          ],
    };
  }
}

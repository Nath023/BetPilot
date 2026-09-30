import {
  ISportsDataProvider,
  IMarketOddsProvider,
  SportsProviderStatus,
} from './sportsProviderTypes.ts';
import { DemoSportsDataProvider } from './demoSportsProvider.ts';
import { DemoMarketOddsProvider } from './demoOddsProvider.ts';

/**
 * ProviderRegistry: Manages active sports-data and market-odds providers.
 * Provides abstraction boundary so prediction engine and app are 100% vendor-agnostic.
 */
export class ProviderRegistry {
  private static sportsProvider: ISportsDataProvider = new DemoSportsDataProvider();
  private static oddsProvider: IMarketOddsProvider = new DemoMarketOddsProvider();

  public static getSportsProvider(): ISportsDataProvider {
    return this.sportsProvider;
  }

  public static setSportsProvider(provider: ISportsDataProvider): void {
    this.sportsProvider = provider;
  }

  public static getOddsProvider(): IMarketOddsProvider {
    return this.oddsProvider;
  }

  public static setOddsProvider(provider: IMarketOddsProvider): void {
    this.oddsProvider = provider;
  }

  public static getStatus(): SportsProviderStatus {
    const isLiveConfigured =
      this.sportsProvider.mode === 'LIVE' && this.sportsProvider.isConfigured();

    return {
      mode: isLiveConfigured ? 'LIVE' : 'DEMO',
      sportsProvider: this.sportsProvider.providerName,
      oddsProvider: this.oddsProvider.providerName,
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

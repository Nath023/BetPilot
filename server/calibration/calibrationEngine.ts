import {
  Ticket,
  Selection,
  PredictionSnapshot,
  CalibrationDashboardData,
  CalibrationDashboardFilter,
  CalibrationBucket,
  MarketPerformanceMetric,
  ConfidenceBandMetric,
  SportPerformanceMetric,
  TimeSeriesPoint,
  BettingFormatMetrics,
  AccuracySummaryMetrics,
  FinancialSummaryMetrics,
  SettledPredictionRecord,
} from '../../shared/types/index.ts';

/**
 * CalibrationEngine: Computes statistical accuracy, Brier scores, calibration reliability,
 * and financial ROI from settled betting tickets and empirical prediction snapshots.
 * Adheres strictly to scientific verification and sports modeling standards.
 */
export class CalibrationEngine {
  /**
   * Primary entry point: Computes full dashboard dataset based on provided filter
   */
  public static computeDashboard(
    tickets: Ticket[],
    snapshots: PredictionSnapshot[] = [],
    filter: Partial<CalibrationDashboardFilter> = {}
  ): CalibrationDashboardData {
    const activeFilter: CalibrationDashboardFilter = {
      dateRange: filter.dateRange || 'all',
      sport: filter.sport || 'all',
      market: filter.market || 'all',
      startDate: filter.startDate,
      endDate: filter.endDate,
    };

    // 1. Extract all individual prediction records from settled tickets and prediction snapshots
    const allRecords = this.extractSettledPredictionRecords(tickets, snapshots);

    // 2. Apply filters
    const filteredRecords = this.applyRecordFilters(allRecords, activeFilter);
    const filteredTickets = this.applyTicketFilters(tickets, activeFilter);

    // 3. Accuracy & Brier score metrics (strictly excluding VOID and PENDING from win-rate & Brier)
    const accuracy = this.computeAccuracyMetrics(filteredRecords, allRecords);

    // 4. Financial ROI metrics
    const financial = this.computeFinancialMetrics(filteredTickets);

    // 5. Betting formats (singles vs accumulators)
    const bettingFormats = this.computeBettingFormatMetrics(filteredTickets, filteredRecords);

    // 6. Probability calibration buckets (50-59%, 60-69%, etc.)
    const calibrationBuckets = this.computeCalibrationBuckets(filteredRecords);

    // 7. Market performance breakdown
    const marketsPerformance = this.computeMarketPerformance(filteredRecords, filteredTickets);

    // 8. Confidence-band breakdown
    const confidenceBands = this.computeConfidenceBands(filteredRecords);

    // 9. Sports performance breakdown
    const sportsPerformance = this.computeSportsPerformance(filteredRecords, filteredTickets);

    // 10. Time series points (daily cumulative ROI and win rate)
    const timeSeries = this.computeTimeSeries(filteredTickets, filteredRecords);

    // 11. Recent settled predictions table (latest 20 records)
    const recentSettledPredictions = [...filteredRecords]
      .sort((a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime())
      .slice(0, 25);

    return {
      filter: activeFilter,
      accuracy,
      financial,
      bettingFormats,
      calibrationBuckets,
      marketsPerformance,
      confidenceBands,
      sportsPerformance,
      timeSeries,
      recentSettledPredictions,
    };
  }

  /**
   * Normalize and extract settled prediction items from both tickets and snapshots
   */
  public static extractSettledPredictionRecords(
    tickets: Ticket[],
    snapshots: PredictionSnapshot[] = []
  ): SettledPredictionRecord[] {
    const records: SettledPredictionRecord[] = [];

    // From tickets selections
    for (const ticket of tickets) {
      for (const sel of ticket.selections) {
        // Only include if selection has a definitive outcome or ticket is settled
        const outcome = sel.status || (ticket.status === 'WON' ? 'WON' : ticket.status === 'LOST' ? 'LOST' : undefined);
        if (!outcome || outcome === 'PENDING') {
          continue; // Rule 6: PENDING selections must be excluded from accuracy records
        }

        // Determine model predicted probability:
        // Priority: confidence (0-1), or 1 / odds
        let prob = sel.confidence;
        if (prob === undefined || isNaN(prob) || prob <= 0) {
          prob = sel.odds > 1 ? 1 / sel.odds : 0.5;
        }
        if (prob > 1) prob = prob / 100; // normalize if entered as percentage

        const sport = this.detectSport(sel.competition, sel.homeTeam);
        const settledDate = sel.settledAt || ticket.settledAt || ticket.updatedAt || ticket.createdAt;

        // Pro-rate stake for single selection in ticket context
        const legStake = ticket.stake / (ticket.selections.length || 1);
        const legReturn = outcome === 'WON' ? Math.round(legStake * sel.odds) : outcome === 'VOID' ? legStake : 0;

        records.push({
          id: sel.id || `sel-rec-${records.length}`,
          ticketId: ticket.id,
          fixture: `${sel.homeTeam} vs ${sel.awayTeam}`,
          competition: sel.competition || 'League Fixture',
          sport,
          market: sel.market,
          selection: sel.selection,
          odds: sel.odds,
          modelEstimatedProbability: Math.min(0.99, Math.max(0.01, prob)),
          confidence: prob,
          outcome: outcome as 'WON' | 'LOST' | 'VOID',
          score: sel.resultScore,
          settledAt: settledDate,
          stake: legStake,
          actualReturn: legReturn,
          details: sel.resultDetails,
        });
      }
    }

    // Also include any standalone prediction snapshots that have actual results
    for (const snap of snapshots) {
      if (!snap.actualResult || snap.actualResult === 'PENDING') {
        continue;
      }
      const alreadyIncluded = records.some((r) => r.id === snap.id);
      if (!alreadyIncluded) {
        const snapSport = (snap as any).sport || this.detectSport(snap.competition, snap.fixture);
        const snapSettled = (snap as any).settledAt || snap.timestamp;
        records.push({
          id: snap.id,
          fixture: snap.fixture,
          competition: snap.competition,
          sport: snapSport,
          market: snap.market,
          selection: snap.selection,
          odds: snap.odds,
          modelEstimatedProbability: snap.modelEstimatedProbability,
          confidence: snap.modelEstimatedProbability,
          outcome: snap.actualResult as 'WON' | 'LOST' | 'VOID',
          settledAt: snapSettled,
        });
      }
    }

    return records;
  }

  /**
   * Filter records by date, sport, and market
   */
  public static applyRecordFilters(
    records: SettledPredictionRecord[],
    filter: CalibrationDashboardFilter
  ): SettledPredictionRecord[] {
    return records.filter((rec) => {
      // Date filter
      if (!this.passesDateFilter(rec.settledAt, filter.dateRange, filter.startDate, filter.endDate)) {
        return false;
      }

      // Sport filter
      if (filter.sport !== 'all' && rec.sport.toLowerCase() !== filter.sport.toLowerCase()) {
        return false;
      }

      // Market filter
      if (!this.passesMarketFilter(rec.market, filter.market)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Filter tickets by date, sport, and market
   */
  public static applyTicketFilters(
    tickets: Ticket[],
    filter: CalibrationDashboardFilter
  ): Ticket[] {
    return tickets.filter((t) => {
      // Must be settled ticket
      const isSettled =
        t.status === 'WON' ||
        t.status === 'LOST' ||
        t.status === 'VOID' ||
        t.settlementStatus === 'WON' ||
        t.settlementStatus === 'LOST' ||
        t.settlementStatus === 'VOID';

      if (!isSettled) return false;

      // Date filter
      const ticketDate = t.settledAt || t.updatedAt || t.createdAt;
      if (!this.passesDateFilter(ticketDate, filter.dateRange, filter.startDate, filter.endDate)) {
        return false;
      }

      // Sport filter
      if (filter.sport !== 'all') {
        const matchesSport = t.selections.some(
          (s) => this.detectSport(s.competition, s.homeTeam).toLowerCase() === filter.sport.toLowerCase()
        );
        if (!matchesSport) return false;
      }

      // Market filter
      if (filter.market !== 'all') {
        const matchesMarket = t.selections.some((s) => this.passesMarketFilter(s.market, filter.market));
        if (!matchesMarket) return false;
      }

      return true;
    });
  }

  /**
   * Accuracy & Brier score evaluation
   * Strictly excludes VOID and PENDING from win-rate and Brier calculations
   */
  public static computeAccuracyMetrics(
    filteredRecords: SettledPredictionRecord[],
    allRawRecords: SettledPredictionRecord[] = []
  ): AccuracySummaryMetrics {
    let correct = 0;
    let incorrect = 0;
    let voidCount = 0;
    let pendingCount = 0;

    // Filtered records are already non-pending
    for (const rec of filteredRecords) {
      if (rec.outcome === 'WON') correct++;
      else if (rec.outcome === 'LOST') incorrect++;
      else if (rec.outcome === 'VOID') voidCount++;
    }

    // Count pending from raw records if needed
    for (const rec of allRawRecords) {
      if ((rec as any).status === 'PENDING' || (rec as any).outcome === 'PENDING') {
        pendingCount++;
      }
    }

    const totalValid = correct + incorrect; // Excludes VOID
    const winRate = totalValid > 0 ? (correct / totalValid) * 100 : 0;

    // Brier Score calculation: Mean squared error between predicted prob and actual binary outcome (1 for won, 0 for lost)
    // VOID selections are strictly excluded!
    let brierSum = 0;
    let brierN = 0;
    let weightedDiffSum = 0;

    for (const rec of filteredRecords) {
      if (rec.outcome === 'WON' || rec.outcome === 'LOST') {
        const actualBinary = rec.outcome === 'WON' ? 1.0 : 0.0;
        const predictedProb = Math.min(1.0, Math.max(0.0, rec.modelEstimatedProbability));
        const squaredErr = Math.pow(predictedProb - actualBinary, 2);
        brierSum += squaredErr;
        weightedDiffSum += Math.abs(predictedProb - actualBinary);
        brierN++;
      }
    }

    const brierScore = brierN > 0 ? Math.round((brierSum / brierN) * 1000) / 1000 : 0;
    const expectedCalibrationError = brierN > 0 ? Math.round((weightedDiffSum / brierN) * 1000) / 1000 : 0;

    let brierRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' = 'GOOD';
    if (brierScore <= 0.15) brierRating = 'EXCELLENT';
    else if (brierScore <= 0.20) brierRating = 'GOOD';
    else if (brierScore <= 0.25) brierRating = 'FAIR';
    else brierRating = 'POOR';

    return {
      totalSettledSelections: totalValid,
      correctSelections: correct,
      incorrectSelections: incorrect,
      voidSelections: voidCount,
      pendingSelections: pendingCount,
      winRate: Math.round(winRate * 10) / 10,
      brierScore,
      brierRating,
      expectedCalibrationError,
    };
  }

  /**
   * Financial ROI metrics calculation
   */
  public static computeFinancialMetrics(settledTickets: Ticket[]): FinancialSummaryMetrics {
    let totalStakes = 0;
    let totalReturns = 0;
    let winningTickets = 0;
    let losingTickets = 0;
    let voidTickets = 0;
    let totalOddsSum = 0;
    let selectionOddsSum = 0;
    let totalSelections = 0;

    for (const ticket of settledTickets) {
      const stake = ticket.stake || 0;
      const ret = ticket.actualReturn !== undefined ? ticket.actualReturn : ticket.status === 'WON' ? ticket.potentialReturn : 0;
      totalStakes += stake;
      totalReturns += ret;

      if (ticket.status === 'WON' || ticket.settlementStatus === 'WON') winningTickets++;
      else if (ticket.status === 'LOST' || ticket.settlementStatus === 'LOST') losingTickets++;
      else if (ticket.status === 'VOID' || ticket.settlementStatus === 'VOID') voidTickets++;

      totalOddsSum += ticket.settledOdds || ticket.totalOdds || 1.0;

      for (const sel of ticket.selections) {
        selectionOddsSum += sel.odds || 1.0;
        totalSelections++;
      }
    }

    const netProfit = totalReturns - totalStakes;
    const roi = totalStakes > 0 ? (netProfit / totalStakes) * 100 : 0;
    const avgTicketOdds = settledTickets.length > 0 ? totalOddsSum / settledTickets.length : 0;
    const avgSelectionOdds = totalSelections > 0 ? selectionOddsSum / totalSelections : 0;
    const profitFactor = totalStakes > 0 ? Math.round((totalReturns / totalStakes) * 100) / 100 : 1.0;

    return {
      totalSettledTickets: settledTickets.length,
      winningTickets,
      losingTickets,
      voidTickets,
      totalStakes,
      totalReturns,
      netProfit,
      roi: Math.round(roi * 10) / 10,
      avgTicketOdds: Math.round(avgTicketOdds * 100) / 100,
      avgSelectionOdds: Math.round(avgSelectionOdds * 100) / 100,
      profitFactor,
    };
  }

  /**
   * Betting format metrics (Singles vs Accumulators)
   */
  public static computeBettingFormatMetrics(
    settledTickets: Ticket[],
    records: SettledPredictionRecord[]
  ): BettingFormatMetrics {
    let singlesCount = 0;
    let singlesWon = 0;
    let singlesStakes = 0;
    let singlesReturns = 0;

    let accasCount = 0;
    let accasWon = 0;
    let accasStakes = 0;
    let accasReturns = 0;
    let accasLegsSum = 0;

    let winningOddsSum = 0;
    let winningCount = 0;
    let losingOddsSum = 0;
    let losingCount = 0;

    for (const ticket of settledTickets) {
      const isWon = ticket.status === 'WON' || ticket.settlementStatus === 'WON';
      const isLost = ticket.status === 'LOST' || ticket.settlementStatus === 'LOST';
      const stake = ticket.stake || 0;
      const ret = ticket.actualReturn || 0;
      const odds = ticket.settledOdds || ticket.totalOdds || 1.0;

      if (isWon) {
        winningOddsSum += odds;
        winningCount++;
      } else if (isLost) {
        losingOddsSum += odds;
        losingCount++;
      }

      if (ticket.selections.length === 1) {
        singlesCount++;
        singlesStakes += stake;
        singlesReturns += ret;
        if (isWon) singlesWon++;
      } else if (ticket.selections.length > 1) {
        accasCount++;
        accasLegsSum += ticket.selections.length;
        accasStakes += stake;
        accasReturns += ret;
        if (isWon) accasWon++;
      }
    }

    const voidLegCount = records.filter((r) => r.outcome === 'VOID').length;
    const totalLegs = records.length;

    return {
      singlesCount,
      singlesWon,
      singlesWinRate: singlesCount > 0 ? Math.round((singlesWon / singlesCount) * 1000) / 10 : 0,
      singlesRoi: singlesStakes > 0 ? Math.round(((singlesReturns - singlesStakes) / singlesStakes) * 1000) / 10 : 0,
      accumulatorsCount: accasCount,
      accumulatorsWon: accasWon,
      accumulatorsWinRate: accasCount > 0 ? Math.round((accasWon / accasCount) * 1000) / 10 : 0,
      accumulatorsRoi: accasStakes > 0 ? Math.round(((accasReturns - accasStakes) / accasStakes) * 1000) / 10 : 0,
      avgAccumulatorLegs: accasCount > 0 ? Math.round((accasLegsSum / accasCount) * 10) / 10 : 0,
      avgWinningOdds: winningCount > 0 ? Math.round((winningOddsSum / winningCount) * 100) / 100 : 0,
      avgLosingOdds: losingCount > 0 ? Math.round((losingOddsSum / losingCount) * 100) / 100 : 0,
      voidLegCount,
      voidLegFrequency: totalLegs > 0 ? Math.round((voidLegCount / totalLegs) * 1000) / 10 : 0,
    };
  }

  /**
   * Computes probability calibration bins comparing estimated probability vs observed win rate
   * Bins: 50-59%, 60-69%, 70-79%, 80-89%, 90%+
   */
  public static computeCalibrationBuckets(records: SettledPredictionRecord[]): CalibrationBucket[] {
    const bucketsConfig = [
      { bucket: '50-59%', min: 0.50, max: 0.5999 },
      { bucket: '60-69%', min: 0.60, max: 0.6999 },
      { bucket: '70-79%', min: 0.70, max: 0.7999 },
      { bucket: '80-89%', min: 0.80, max: 0.8999 },
      { bucket: '90%+',   min: 0.90, max: 1.0000 },
    ];

    // Exclude VOID from calibration evaluation
    const validRecords = records.filter((r) => r.outcome === 'WON' || r.outcome === 'LOST');

    return bucketsConfig.map((cfg) => {
      const items = validRecords.filter((r) => {
        const p = r.modelEstimatedProbability;
        return p >= cfg.min && (cfg.max >= 1.0 ? p <= cfg.max : p < cfg.max + 0.0001);
      });

      const count = items.length;
      const wonCount = items.filter((i) => i.outcome === 'WON').length;
      const lostCount = items.filter((i) => i.outcome === 'LOST').length;

      const probSum = items.reduce((acc, i) => acc + i.modelEstimatedProbability, 0);
      const meanPredictedProbability = count > 0 ? Math.round((probSum / count) * 1000) / 1000 : (cfg.min + 0.05);
      const observedWinRate = count > 0 ? Math.round((wonCount / count) * 1000) / 10 : 0;
      const difference = count > 0 ? Math.round((observedWinRate - meanPredictedProbability * 100) * 10) / 10 : 0;
      const calibrationError = Math.round(Math.abs(meanPredictedProbability - observedWinRate / 100) * 1000) / 1000;

      return {
        bucket: cfg.bucket,
        minProbability: cfg.min,
        maxProbability: cfg.max,
        count,
        wonCount,
        lostCount,
        meanPredictedProbability,
        observedWinRate,
        difference,
        calibrationError,
      };
    });
  }

  /**
   * Group performance by Market
   */
  public static computeMarketPerformance(
    records: SettledPredictionRecord[],
    tickets: Ticket[]
  ): MarketPerformanceMetric[] {
    const marketMap: Map<string, { total: number; won: number; lost: number; voidCount: number; oddsSum: number; stakes: number; returns: number }> = new Map();

    for (const rec of records) {
      const normMarket = this.normalizeMarketGroup(rec.market);
      if (!marketMap.has(normMarket)) {
        marketMap.set(normMarket, { total: 0, won: 0, lost: 0, voidCount: 0, oddsSum: 0, stakes: 0, returns: 0 });
      }
      const entry = marketMap.get(normMarket)!;
      entry.total++;
      if (rec.outcome === 'WON') entry.won++;
      else if (rec.outcome === 'LOST') entry.lost++;
      else if (rec.outcome === 'VOID') entry.voidCount++;

      entry.oddsSum += rec.odds;
      entry.stakes += rec.stake || 1000;
      entry.returns += rec.actualReturn || 0;
    }

    const list: MarketPerformanceMetric[] = [];
    marketMap.forEach((val, market) => {
      const settledCount = val.won + val.lost; // exclude void from winrate denominator
      const winRate = settledCount > 0 ? Math.round((val.won / settledCount) * 1000) / 10 : 0;
      const netProfit = val.returns - val.stakes;
      const roi = val.stakes > 0 ? Math.round((netProfit / val.stakes) * 1000) / 10 : 0;
      const avgOdds = val.total > 0 ? Math.round((val.oddsSum / val.total) * 100) / 100 : 0;

      list.push({
        market,
        totalSelections: val.total,
        wonSelections: val.won,
        lostSelections: val.lost,
        voidSelections: val.voidCount,
        winRate,
        totalStakes: Math.round(val.stakes),
        totalReturns: Math.round(val.returns),
        netProfit: Math.round(netProfit),
        roi,
        avgOdds,
      });
    });

    return list.sort((a, b) => b.totalSelections - a.totalSelections);
  }

  /**
   * Group performance by Confidence Band
   */
  public static computeConfidenceBands(records: SettledPredictionRecord[]): ConfidenceBandMetric[] {
    const bandsConfig = [
      { band: '<60%', min: 0.0, max: 0.5999 },
      { band: '60-69%', min: 0.60, max: 0.6999 },
      { band: '70-79%', min: 0.70, max: 0.7999 },
      { band: '80-89%', min: 0.80, max: 0.8999 },
      { band: '90%+', min: 0.90, max: 1.0000 },
    ];

    return bandsConfig.map((cfg) => {
      const items = records.filter((r) => {
        const p = r.modelEstimatedProbability;
        return p >= cfg.min && (cfg.max >= 1.0 ? p <= cfg.max : p < cfg.max + 0.0001);
      });

      const total = items.length;
      const won = items.filter((i) => i.outcome === 'WON').length;
      const lost = items.filter((i) => i.outcome === 'LOST').length;
      const settledCount = won + lost;
      const winRate = settledCount > 0 ? Math.round((won / settledCount) * 1000) / 10 : 0;

      const oddsSum = items.reduce((acc, i) => acc + i.odds, 0);
      const avgOdds = total > 0 ? Math.round((oddsSum / total) * 100) / 100 : 0;

      let brierSum = 0;
      for (const item of items) {
        if (item.outcome === 'WON' || item.outcome === 'LOST') {
          const act = item.outcome === 'WON' ? 1.0 : 0.0;
          brierSum += Math.pow(item.modelEstimatedProbability - act, 2);
        }
      }
      const brierScore = settledCount > 0 ? Math.round((brierSum / settledCount) * 1000) / 1000 : 0;

      const totalStakes = items.reduce((acc, i) => acc + (i.stake || 1000), 0);
      const totalReturns = items.reduce((acc, i) => acc + (i.actualReturn || 0), 0);
      const roi = totalStakes > 0 ? Math.round(((totalReturns - totalStakes) / totalStakes) * 1000) / 10 : 0;

      return {
        band: cfg.band,
        totalSelections: total,
        wonSelections: won,
        lostSelections: lost,
        winRate,
        avgOdds,
        brierScore,
        roi,
      };
    });
  }

  /**
   * Group performance by Sport
   */
  public static computeSportsPerformance(
    records: SettledPredictionRecord[],
    tickets: Ticket[]
  ): SportPerformanceMetric[] {
    const sportMap: Map<string, { total: number; won: number; lost: number; stakes: number; returns: number }> = new Map();

    for (const rec of records) {
      const sport = rec.sport || 'Football';
      if (!sportMap.has(sport)) {
        sportMap.set(sport, { total: 0, won: 0, lost: 0, stakes: 0, returns: 0 });
      }
      const e = sportMap.get(sport)!;
      e.total++;
      if (rec.outcome === 'WON') e.won++;
      else if (rec.outcome === 'LOST') e.lost++;
      e.stakes += rec.stake || 1000;
      e.returns += rec.actualReturn || 0;
    }

    const list: SportPerformanceMetric[] = [];
    sportMap.forEach((val, sport) => {
      const settledCount = val.won + val.lost;
      const winRate = settledCount > 0 ? Math.round((val.won / settledCount) * 1000) / 10 : 0;
      const roi = val.stakes > 0 ? Math.round(((val.returns - val.stakes) / val.stakes) * 1000) / 10 : 0;
      list.push({
        sport,
        totalSelections: val.total,
        wonSelections: val.won,
        lostSelections: val.lost,
        winRate,
        totalStakes: Math.round(val.stakes),
        totalReturns: Math.round(val.returns),
        roi,
      });
    });

    return list.sort((a, b) => b.totalSelections - a.totalSelections);
  }

  /**
   * Time series evolution of cumulative win rate and ROI
   */
  public static computeTimeSeries(
    settledTickets: Ticket[],
    records: SettledPredictionRecord[]
  ): TimeSeriesPoint[] {
    // Collect dates from tickets and records
    const dateMap: Map<string, { settledCount: number; wonCount: number; stakes: number; returns: number }> = new Map();

    for (const t of settledTickets) {
      const rawDate = t.settledAt || t.updatedAt || t.createdAt;
      const date = rawDate ? rawDate.split('T')[0] : new Date().toISOString().split('T')[0];

      if (!dateMap.has(date)) {
        dateMap.set(date, { settledCount: 0, wonCount: 0, stakes: 0, returns: 0 });
      }
      const entry = dateMap.get(date)!;
      entry.settledCount++;
      if (t.status === 'WON' || t.settlementStatus === 'WON') entry.wonCount++;
      entry.stakes += t.stake || 0;
      entry.returns += t.actualReturn || 0;
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    const points: TimeSeriesPoint[] = [];

    let cumWon = 0;
    let cumSettled = 0;
    let cumStakes = 0;
    let cumReturns = 0;

    for (const date of sortedDates) {
      const d = dateMap.get(date)!;
      cumWon += d.wonCount;
      cumSettled += d.settledCount;
      cumStakes += d.stakes;
      cumReturns += d.returns;

      const dailyWinRate = d.settledCount > 0 ? Math.round((d.wonCount / d.settledCount) * 1000) / 10 : 0;
      const cumWinRate = cumSettled > 0 ? Math.round((cumWon / cumSettled) * 1000) / 10 : 0;
      const dailyProfit = d.returns - d.stakes;
      const cumProfit = cumReturns - cumStakes;
      const cumRoi = cumStakes > 0 ? Math.round((cumProfit / cumStakes) * 1000) / 10 : 0;

      points.push({
        date,
        timestamp: `${date}T00:00:00Z`,
        settledCount: d.settledCount,
        wonCount: d.wonCount,
        winRate: dailyWinRate,
        cumulativeWinRate: cumWinRate,
        stakes: d.stakes,
        returns: d.returns,
        profit: dailyProfit,
        cumulativeProfit: cumProfit,
        cumulativeRoi: cumRoi,
      });
    }

    return points;
  }

  // --- HELPER FILTER AND NORMALIZATION UTILITIES ---

  private static passesDateFilter(
    dateStr?: string,
    filterRange: 'all' | '7d' | '30d' | '90d' = 'all',
    startDate?: string,
    endDate?: string
  ): boolean {
    if (!dateStr) return true;
    if (filterRange === 'all' && !startDate && !endDate) return true;

    const itemTime = new Date(dateStr).getTime();
    if (isNaN(itemTime)) return true;

    if (startDate && itemTime < new Date(startDate).getTime()) return false;
    if (endDate && itemTime > new Date(endDate).getTime()) return false;

    if (filterRange !== 'all') {
      const now = new Date().getTime();
      let days = 30;
      if (filterRange === '7d') days = 7;
      if (filterRange === '30d') days = 30;
      if (filterRange === '90d') days = 90;

      const cutoff = now - days * 24 * 60 * 60 * 1000;
      if (itemTime < cutoff) return false;
    }

    return true;
  }

  private static passesMarketFilter(
    market: string,
    filterMarket: string
  ): boolean {
    if (filterMarket === 'all') return true;
    const m = (market || '').toLowerCase();

    if (filterMarket === '1x2') {
      return m.includes('1x2') || m.includes('match winner') || m.includes('winner') || m.includes('full time');
    }
    if (filterMarket === 'over_under') {
      return m.includes('over') || m.includes('under') || m.includes('goals');
    }
    if (filterMarket === 'btts') {
      return m.includes('btts') || m.includes('both teams to score') || m.includes('gg/ng');
    }
    if (filterMarket === 'double_chance') {
      return m.includes('double chance') || m.includes('chance') || m.includes('1x') || m.includes('x2') || m.includes('12');
    }
    if (filterMarket === 'dnb') {
      return m.includes('draw no bet') || m.includes('dnb');
    }

    return true;
  }

  private static normalizeMarketGroup(market: string): string {
    const m = (market || '').toLowerCase();
    if (m.includes('1x2') || m.includes('match winner') || m.includes('full time')) return '1X2 Match Winner';
    if (m.includes('over') || m.includes('under') || m.includes('goals')) return 'Over/Under Goals';
    if (m.includes('btts') || m.includes('both teams to score') || m.includes('gg/ng')) return 'Both Teams to Score';
    if (m.includes('double chance') || m.includes('chance')) return 'Double Chance';
    if (m.includes('draw no bet') || m.includes('dnb')) return 'Draw No Bet';
    return market || 'Other';
  }

  private static detectSport(competition?: string, team?: string): string {
    const c = (competition || '').toLowerCase();
    const t = (team || '').toLowerCase();

    if (c.includes('nba') || c.includes('basketball') || t.includes('lakers') || t.includes('celtics')) {
      return 'Basketball';
    }
    if (c.includes('atp') || c.includes('wta') || c.includes('tennis') || c.includes('wimbledon')) {
      return 'Tennis';
    }
    return 'Football';
  }
}

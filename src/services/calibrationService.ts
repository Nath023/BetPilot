import {
  Ticket,
  PredictionSnapshot,
  CalibrationDashboardData,
  CalibrationDashboardFilter,
} from '../../shared/types/index.ts';
import { CalibrationEngine } from '../../server/calibration/calibrationEngine.ts';
import { authService, firestoreService } from './firebase.ts';
import { storage } from './storage.ts';
import { api } from './api.ts';
import { DEMO_TICKETS } from '../../shared/constants/demoData.ts';

export const calibrationService = {
  /**
   * Retrieves all settled tickets and prediction snapshots from Firestore (or local storage fallback),
   * and computes calibration, accuracy, and ROI metrics with active filtering.
   */
  async getDashboardData(
    filter: Partial<CalibrationDashboardFilter> = {}
  ): Promise<CalibrationDashboardData> {
    let tickets: Ticket[] = [];
    let snapshots: PredictionSnapshot[] = [];

    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      try {
        const [cloudTickets, cloudPredictions] = await Promise.all([
          firestoreService.loadTickets(currentUser.uid),
          firestoreService.loadPredictions(currentUser.uid),
        ]);

        tickets = cloudTickets;
        snapshots = cloudPredictions;
      } catch (e) {
        console.warn('Failed to load cloud metrics, falling back to local cache:', e);
      }
    }

    // If no tickets from cloud (or offline / not logged in), use local storage tickets
    if (tickets.length === 0) {
      tickets = storage.getTickets();
    }

    // If still empty, seed with demo tickets so dashboard has baseline calibration data
    if (tickets.length === 0) {
      tickets = DEMO_TICKETS;
    }

    // Load prediction snapshots if empty
    if (snapshots.length === 0) {
      try {
        const hist = await api.getPredictionHistory();
        if (hist && Array.isArray(hist.snapshots)) {
          snapshots = hist.snapshots;
        }
      } catch (e) {
        console.warn('Could not load prediction history snapshots:', e);
      }
    }

    return CalibrationEngine.computeDashboard(tickets, snapshots, filter);
  },
};

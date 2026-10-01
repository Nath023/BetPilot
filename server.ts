import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { CopilotAgent } from './server/agents/copilotAgent.ts';
import { ToolImplementations } from './server/tools/implementations.ts';
import { BookmakerRegistry } from './server/providers/bookmakerRegistry.ts';
import { SportsDataProvider } from './server/providers/sportsProvider.ts';
import { SettlementEngine } from './server/settlement/settlementEngine.ts';
import { RolloverSettler } from './server/settlement/rolloverSettler.ts';
import { ResultProvider } from './server/settlement/resultProvider.ts';
import { CalibrationEngine } from './server/calibration/calibrationEngine.ts';
import { DEMO_TICKETS, DEMO_ROLLOVER } from './shared/constants/demoData.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Middleware for large multimodal image uploads
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // --- API Endpoints ---

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'BetPilot AI API',
      timestamp: new Date().toISOString(),
      geminiConfigured: !!process.env.GEMINI_API_KEY,
    });
  });

  // Chat copilot interaction
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { message, history, currentTicket, imageBase64, mimeType } = req.body;
      const response = await CopilotAgent.processRequest({
        message,
        history,
        currentTicket,
        imageBase64,
        mimeType,
      });
      res.json({ success: true, ...response });
    } catch (err: any) {
      console.error('API /api/chat error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to process chat message',
        message: err.message || 'Internal server error',
      });
    }
  });

  // Multimodal ticket extraction direct endpoint
  app.post('/api/extract-ticket', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType, bookmakerHint } = req.body;
      const result = await ToolImplementations.extractTicketFromImage({
        imageBase64,
        mimeType,
        bookmakerHint,
      });
      res.json(result);
    } catch (err: any) {
      console.error('API /api/extract-ticket error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to extract ticket from image',
        message: err.message,
      });
    }
  });

  // Generic tool execution
  app.post('/api/tools/:toolName', async (req: Request, res: Response) => {
    const { toolName } = req.params;
    const params = req.body;

    try {
      switch (toolName) {
        case 'validate_ticket':
          return res.json(ToolImplementations.validateTicket(params));
        case 'calculate_ticket':
          return res.json(ToolImplementations.calculateTicket(params));
        case 'trim_ticket':
          return res.json(ToolImplementations.trimTicket(params));
        case 'split_ticket':
          return res.json(ToolImplementations.splitTicket(params));
        case 'generate_alternative_ticket':
          return res.json(ToolImplementations.generateAlternativeTicket(params));
        case 'compare_tickets':
          return res.json(ToolImplementations.compareTickets(params));
        case 'research_fixture':
          return res.json(await ToolImplementations.researchFixture(params));
        case 'calculate_probability':
          return res.json(ToolImplementations.calculateProbability(params));
        case 'calculate_ev':
          return res.json(ToolImplementations.calculateEv(params));
        case 'calculate_rollover':
          return res.json(ToolImplementations.calculateRollover(params));
        case 'create_rollover_tracker':
          return res.json(ToolImplementations.createRolloverTracker(params));
        case 'update_rollover_progress':
          return res.json(ToolImplementations.updateRolloverProgress(params));
        case 'bookmaker_capabilities':
          return res.json(ToolImplementations.bookmakerCapabilities(params));
        case 'convert_ticket':
          return res.json(ToolImplementations.convertTicket(params));
        case 'generate_booking_code':
          return res.json(ToolImplementations.generateBookingCode(params));
        case 'save_ticket':
          return res.json(ToolImplementations.saveTicket(params));
        case 'delete_ticket':
          return res.json(ToolImplementations.deleteTicket(params));
        case 'get_ticket_history':
          return res.json(ToolImplementations.getTicketHistory());
        case 'research_url':
          return res.json(ToolImplementations.researchUrl(params));
        case 'analyze_fixture':
          return res.json(await ToolImplementations.analyzeFixture(params));
        case 'generate_candidate_selections':
          return res.json(ToolImplementations.generateCandidateSelections(params));
        case 'generate_slip':
          return res.json(ToolImplementations.generateSlip(params));
        case 'generate_daily_rollover':
          return res.json(ToolImplementations.generateDailyRollover(params));
        case 'record_rollover_day':
          return res.json(ToolImplementations.recordRolloverDay(params));
        case 'get_daily_rollover':
          return res.json(ToolImplementations.getDailyRollover());
        case 'get_prediction_history':
          return res.json(ToolImplementations.getPredictionHistory());
        default:
          return res.status(404).json({ success: false, error: `Unknown tool: ${toolName}` });
      }
    } catch (err: any) {
      console.error(`Tool error [${toolName}]:`, err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Daily Rollover Challenge endpoints
  app.get('/api/daily-rollover', (_req: Request, res: Response) => {
    res.json(ToolImplementations.getDailyRollover());
  });

  app.post('/api/daily-rollover/generate', (req: Request, res: Response) => {
    res.json(ToolImplementations.generateDailyRollover(req.body));
  });

  app.post('/api/daily-rollover/record', (req: Request, res: Response) => {
    res.json(ToolImplementations.recordRolloverDay(req.body));
  });

  // Predictions endpoints
  app.get('/api/prediction/candidates', (req: Request, res: Response) => {
    const risk = req.query.risk as any;
    res.json(ToolImplementations.generateCandidateSelections({ riskPreference: risk }));
  });

  app.post('/api/prediction/analyze-url', (req: Request, res: Response) => {
    res.json(ToolImplementations.researchUrl(req.body));
  });

  app.get('/api/prediction/history', (_req: Request, res: Response) => {
    res.json(ToolImplementations.getPredictionHistory());
  });

  // --- Automated Bet Settlement & Verification Endpoints ---
  app.post('/api/settlement/ticket', async (req: Request, res: Response) => {
    try {
      const { ticket, customResults } = req.body;
      if (!ticket) return res.status(400).json({ success: false, error: 'Ticket required for settlement' });
      const result = await SettlementEngine.settleTicket(ticket, customResults);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('API /api/settlement/ticket error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/settlement/batch', async (req: Request, res: Response) => {
    try {
      const { tickets, customResults } = req.body;
      if (!Array.isArray(tickets)) return res.status(400).json({ success: false, error: 'Tickets array required' });
      const results = await SettlementEngine.settleTickets(tickets, customResults);
      res.json({ success: true, results });
    } catch (err: any) {
      console.error('API /api/settlement/batch error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/settlement/rollover', async (req: Request, res: Response) => {
    try {
      const { challenge, ticket, dayNumber, customResults } = req.body;
      if (!challenge || !ticket) {
        return res.status(400).json({ success: false, error: 'Challenge and ticket required' });
      }
      const result = await RolloverSettler.settleRolloverDay(challenge, ticket, dayNumber, customResults);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('API /api/settlement/rollover error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/settlement/results', async (_req: Request, res: Response) => {
    try {
      const results = await ResultProvider.getAllResults();
      res.json({ success: true, results });
    } catch (err: any) {
      console.error('API /api/settlement/results error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Model Accuracy & ROI Calibration Endpoints ---
  app.post('/api/calibration/compute', (req: Request, res: Response) => {
    try {
      const { tickets = [], snapshots = [], filter = {} } = req.body;
      const dashboardData = CalibrationEngine.computeDashboard(tickets, snapshots, filter);
      res.json({ success: true, ...dashboardData });
    } catch (err: any) {
      console.error('API /api/calibration/compute error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/calibration/metrics', (req: Request, res: Response) => {
    try {
      const dateRange = (req.query.dateRange as any) || 'all';
      const sport = (req.query.sport as any) || 'all';
      const market = (req.query.market as any) || 'all';

      // Settle demo tickets against benchmark results for baseline metrics
      const dashboardData = CalibrationEngine.computeDashboard(
        DEMO_TICKETS,
        ToolImplementations.getPredictionHistory().snapshots,
        { dateRange, sport, market }
      );
      res.json({ success: true, ...dashboardData });
    } catch (err: any) {
      console.error('API /api/calibration/metrics error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Sports fixtures and status
  app.get('/api/sports/fixtures', async (req: Request, res: Response) => {
    const q = req.query.q as string;
    const fixtures = await SportsDataProvider.searchFixtures(q || '');
    res.json({
      success: true,
      fixtures,
      status: SportsDataProvider.getStatus(),
    });
  });

  // Sports provider status (Phase 2E)
  app.get('/api/sports/status', (_req: Request, res: Response) => {
    const status = SportsDataProvider.getStatus();
    res.json({
      mode: status.mode,
      sportsProvider: status.sportsProvider,
      oddsProvider: status.oddsProvider,
      configured: status.configured,
      liveDataAvailable: status.liveDataAvailable,
      freshness: status.freshness,
      limitations: status.limitations,
    });
  });

  // Bookmakers registry
  app.get('/api/bookmakers', (_req: Request, res: Response) => {
    res.json({
      success: true,
      bookmakers: BookmakerRegistry.getAll(),
    });
  });

  // Demo initial data
  app.get('/api/demo-data', (_req: Request, res: Response) => {
    res.json({
      success: true,
      demoTickets: DEMO_TICKETS,
      demoRollover: DEMO_ROLLOVER,
    });
  });

  // --- Vite / Frontend Serving ---
  if (process.env.NODE_ENV === 'production') {
    // In production, serve static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // In development, mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BetPilot AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[BetPilot AI] Failed to start server:', err);
  process.exit(1);
});

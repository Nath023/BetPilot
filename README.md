# BetPilot AI - Sports Research & Betting Copilot

BetPilot AI is a production-oriented AI sports copilot and ticket-management workspace built for football bettors (with deep support for African sports-betting markets such as SportyBet, Bet9ja, 1xBet, and BetKing).

## 🚀 Product Principle: Zero Hallucination & Pure Transparency

BetPilot AI is an AI-assisted sports research and ticket-management tool. It **never guarantees wins**, claims certainty about sporting outcomes, fabricates bookmaker odds or booking codes, or presents AI-generated probabilities as facts.

Every metric in BetPilot AI is strictly source-labeled:
1. **VERIFIED:** Retrieved from verified historical sports databases or official API feeds.
2. **USER_PROVIDED:** Extracted from user ticket screenshots or manually entered.
3. **CALCULATED:** Deterministic mathematical computations (decimal odds, potential return, bonus rollover).
4. **AI_ESTIMATE:** Statistical model estimates clearly labeled with confidence, assumptions, and limitations.
5. **UNAVAILABLE:** Transparently declared when external providers or live endpoints are unconfigured.

---

## 🛠️ Architecture

```
/
├── server.ts                  # Full-stack Node/Express entry point with Vite middleware
├── server/
│   ├── agents/
│   │   ├── systemPrompt.ts    # Grounded BetPilot AI copilot prompt
│   │   └── copilotAgent.ts    # Agent loop with tool-routing & intent dispatch
│   ├── tools/
│   │   └── implementations.ts # 20 deterministic & vision agent tools
│   └── providers/
│       ├── bookmakerRegistry.ts  # SportyBet, Bet9ja, 1xBet, BetKing adapters
│       └── sportsProvider.ts     # Fixture research data provider
├── shared/
│   ├── types/index.ts         # TypeScript models (Ticket, Selection, Rollover, etc.)
│   ├── constants/
│   │   ├── bookmakers.ts      # Bookmaker capabilities & conversion dictionaries
│   │   └── demoData.ts        # Benchmarked test tickets and fixtures
│   └── utils/
│       └── calculations.ts    # Deterministic odds, EV, and rollover formulas
└── src/
    ├── components/
    │   ├── chat/              # ChatWindow, ChatComposer, ExtractedTicketPreview
    │   ├── tickets/           # TicketEditor, SelectionRow, Multi-Leg Inspector
    │   ├── rollover/          # RolloverDashboard, Wagering progress bar
    │   ├── research/          # ResearchPanel, H2H statistics, EV Calculator
    │   ├── history/           # HistoryList, Multi-ticket comparison
    │   ├── settings/          # Responsible gaming limits & provider status
    │   ├── layout/            # AppShell, Header, Sidebar, ActiveTicketPanel
    │   └── common/            # Badges, ConfirmationModal, ResponsibleBanner
    ├── context/               # AuthContext, TicketContext, ChatContext
    └── services/              # api.ts, storage.ts
```

---

## 📐 Deterministic Mathematical Formulas

- **Combined Decimal Odds:** `Odds_Total = Odds_1 × Odds_2 × ... × Odds_N`
- **Potential Return:** `Return = Stake × Odds_Total`
- **Net Potential Profit:** `Profit = Return - Stake`
- **Implied Break-Even Probability:** `P_implied = 1 / DecimalOdds`
- **Expected Value (EV):** `EV = (P_estimated × DecimalOdds) - 1`
- **Bonus Rollover Wagering Target:** `RequiredWager = BonusAmount × RolloverMultiplier`
- **Remaining Rollover:** `Remaining = max(0, RequiredWager - CompletedWager)`

---

## 🤖 20 Registered Agent Tools

1. `extract_ticket_from_image`: Gemini multimodal ticket reading with blur/cutoff uncertainty flags.
2. `parse_booking_code`: Formats validation for SportyBet, Bet9ja, 1xBet, BetKing.
3. `validate_ticket`: Verifies odds > 1.0, checks for duplicate legs or correlated fixtures.
4. `calculate_ticket`: Calculates decimal odds, payouts, profits, and implied probabilities.
5. `trim_ticket`: Proposes trimming high-risk selections with required confirmation.
6. `split_ticket`: Generates doubles/trebles combinations to hedge accumulator variance.
7. `generate_alternative_ticket`: Creates lower-risk, balanced, or fewer-selection tickets.
8. `compare_tickets`: Side-by-side comparison across selections, odds, and returns.
9. `research_fixture`: Retrieves verified H2H, recent form, home/away splits, and standings.
10. `calculate_probability`: Implied probability and house margin edge analysis.
11. `calculate_ev`: Mathematical expected value per unit stake.
12. `calculate_rollover`: Bonus clearance progress calculation.
13. `create_rollover_tracker`: Sets up tracking for bookmaker promotions.
14. `update_rollover_progress`: Logs newly settled tickets towards rollover requirement.
15. `bookmaker_capabilities`: Returns real supported markets and integration capabilities.
16. `convert_ticket`: Semantic translation between bookmaker market nomenclature.
17. `generate_booking_code`: Transparently reports unsupported B2B status without fabricating fake codes.
18. `save_ticket`: Persists ticket to user library.
19. `delete_ticket`: Permanently removes ticket with explicit confirmation dialog.
20. `get_ticket_history`: Retrieves all saved user tickets.
21. `research_url`: Audits external fixture pages, sports news, or public X/Twitter match predictions.
22. `analyze_fixture`: Deep statistical evaluation across 1X2, Over/Under, Double Chance, and BTTS.
23. `generate_candidate_selections`: Evaluates all available fixtures against empirical data quality thresholds.
24. `generate_slip`: Generates multiple candidate slips (Option A, Option B, Option C) within target odds range.
25. `generate_daily_rollover`: Builds daily candidate slips for the 10-day challenge targeting 4.00 - 5.00 odds.
26. `record_rollover_day`: Resolves daily outcome (Won, Lost, Void) and updates bankroll progression.
27. `get_daily_rollover`: Retrieves the active daily challenge and progress.
28. `get_prediction_history`: Calibrates model prediction snapshots for future empirical backtesting.

---

## ⚡ Stage 2: Prediction Engine & Daily Rollover System

- **TransparentStatisticalModel:** Derives probabilities from empirical frequencies, home advantage, and H2H Bayesian updates without claiming certainty.
- **Correlation Control:** Flags and excludes intra-match correlated picks (e.g. Team A Win + Team A Over 1.5).
- **External URL & X/Twitter Analyzer:** Distinguishes "Source claim" from "BetPilot independent analysis".
- **Daily Rollover Challenge:** 10-day progression tracker targeting 4.00 - 5.00 daily odds with custom Slip Builder.

---

## 🛡️ Responsible Gambling Safeguards

- Session time alerts and reminder banners.
- Max stake warning limits configured by user.
- Accumulator size caution alerts on long-odds tickets.
- Direct links to confidential support organizations (GamCare, Gamblers Anonymous).
- Anti-loss chasing guardrails embedded in system prompts.

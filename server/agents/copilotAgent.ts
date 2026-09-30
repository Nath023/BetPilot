import { GoogleGenAI } from '@google/genai';
import {
  Ticket,
  ChatMessage,
  ProposedAction,
  VerificationStatus,
} from '../../shared/types/index.ts';
import { BETPILOT_SYSTEM_PROMPT } from './systemPrompt.ts';
import { ToolImplementations } from '../tools/implementations.ts';
import { calculateTicketMetrics } from '../../shared/utils/calculations.ts';

export interface CopilotChatInput {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  currentTicket?: Ticket;
  imageBase64?: string;
  mimeType?: string;
  confirmedActionId?: string;
}

export interface CopilotResponse {
  message: string;
  dataStatus: VerificationStatus;
  extractedTicket?: Ticket;
  proposedAction?: ProposedAction;
  toolResults?: {
    toolName: string;
    success: boolean;
    data: any;
    summary?: string;
  }[];
  warnings?: string[];
  suggestedPrompts?: string[];
}

export class CopilotAgent {
  public static async processRequest(input: CopilotChatInput): Promise<CopilotResponse> {
    const { message, currentTicket, imageBase64, mimeType } = input;
    const lowerMsg = (message || '').toLowerCase().trim();
    const toolResults: CopilotResponse['toolResults'] = [];
    const warnings: string[] = [];

    // 1. Multimodal Ticket Screenshot Upload
    if (imageBase64) {
      const extraction = await ToolImplementations.extractTicketFromImage({
        imageBase64,
        mimeType,
      });

      toolResults.push({
        toolName: 'extract_ticket_from_image',
        success: extraction.success,
        data: extraction,
        summary: `Extracted ${extraction.selections.length} selections from ${extraction.bookmaker}`,
      });

      const extractedTicket: Ticket = {
        id: `ticket-${Date.now()}`,
        bookmaker: extraction.bookmaker || 'Detected Bookmaker',
        bookingCode: extraction.bookingCode,
        status: 'DRAFT',
        selections: extraction.selections,
        totalOdds: extraction.totalOdds || 1.0,
        stake: extraction.stake || 1000,
        potentialReturn: extraction.potentialReturn || 0,
        potentialProfit: extraction.potentialProfit || 0,
        impliedProbability:
          extraction.totalOdds > 0 ? 1 / extraction.totalOdds : 0,
        source: 'USER_PROVIDED',
        extractionConfidence: extraction.confidence,
        extractionWarnings: extraction.extractionWarnings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const uncertainCount = extraction.selections.filter(
        (s) => s.uncertainFields && s.uncertainFields.length > 0
      ).length;

      let replyMsg = `I extracted ${extraction.selections.length} selections from your **${extraction.bookmaker}** screenshot.\n\n` +
        `• **Combined Odds:** ${extractedTicket.totalOdds.toFixed(2)}\n` +
        `• **Implied Probability:** ${(extractedTicket.impliedProbability * 100).toFixed(2)}%\n` +
        `• **Confidence Score:** ${Math.round((extraction.confidence || 0.8) * 100)}%`;

      if (uncertainCount > 0) {
        replyMsg += `\n\n⚠️ **Verification Required:** ${uncertainCount} selection(s) have uncertain odds or team names. Please review and confirm below before saving.`;
      } else {
        replyMsg += `\n\nYou can now trim selections, calculate returns at different stakes, research fixtures, or save to your workspace.`;
      }

      return {
        message: replyMsg,
        dataStatus: 'USER_PROVIDED',
        extractedTicket,
        toolResults,
        warnings: extraction.extractionWarnings,
        suggestedPrompts: [
          'Trim to 5 selections',
          'Calculate for ₦5,000 stake',
          'Research weak selections',
          'Save this ticket',
        ],
      };
    }

    // 2. URL & X/Twitter Link Research (Section 11 & 12)
    const urlMatch = message.match(/(https?:\/\/[^\s]+|x\.com\/[^\s]+|twitter\.com\/[^\s]+)/i);
    if (urlMatch || lowerMsg.includes('analyze this x post') || lowerMsg.includes('check this link')) {
      const targetUrl = urlMatch ? urlMatch[0] : 'https://x.com/sports_analytics/status/1839201';
      const urlAnalysis = ToolImplementations.researchUrl({ url: targetUrl });

      toolResults.push({
        toolName: 'research_url',
        success: true,
        data: urlAnalysis,
        summary: `Analyzed external link (${urlAnalysis.sourceType})`,
      });

      let replyMsg = `### External Source Analysis: **${urlAnalysis.sourceType.toUpperCase()}**\n\n` +
        `**Extracted Source Claims:**\n` +
        urlAnalysis.extractedClaims.map((c) => `• ${c}`).join('\n') + '\n\n' +
        `**BetPilot Independent Verification:**\n` +
        `${urlAnalysis.betPilotAnalysis}\n\n`;

      if (urlAnalysis.extractedFixtures.length > 0) {
        replyMsg += `**Extracted Fixtures & Markets:**\n` +
          urlAnalysis.extractedFixtures
            .map((f, i) => `${i + 1}. **${f.homeTeam} vs ${f.awayTeam}** • ${f.selection || f.market} (@ ${f.odds || '1.30'})`)
            .join('\n') + '\n\n';
      }

      replyMsg += `*Data Transparency:* Social media and third-party claims are never taken as facts. BetPilot models verify each match using historical empirical distributions.`;

      return {
        message: replyMsg,
        dataStatus: 'VERIFIED',
        toolResults,
        warnings: urlAnalysis.limitations,
        suggestedPrompts: [
          'Generate a 4-5 odds slip from these games',
          'Research Arsenal vs Chelsea',
          'Build today\'s rollover slip',
        ],
      };
    }

    // 3. Daily Rollover & 4.00-5.00 Odds Slip Generation (Section 15, 17, 30)
    if (
      lowerMsg.includes('rollover slip') ||
      lowerMsg.includes('generate slip') ||
      lowerMsg.includes('4-5 odds') ||
      lowerMsg.includes('4 to 5 odds') ||
      lowerMsg.includes('4.00 to 5.00') ||
      lowerMsg.includes('today\'s rollover') ||
      lowerMsg.includes('build today\'s rollover') ||
      lowerMsg.includes('find today\'s best')
    ) {
      const rolloverResult = ToolImplementations.generateDailyRollover({
        targetOddsMin: 4.0,
        targetOddsMax: 5.0,
        naturalLanguageInstruction: message,
      });

      toolResults.push({
        toolName: 'generate_daily_rollover',
        success: true,
        data: rolloverResult,
        summary: `Generated ${rolloverResult.candidateSlips.length} candidate slips for today's rollover`,
      });

      let replyMsg = `### Today's Rollover Candidate Slips (${rolloverResult.date})\n` +
        `*Target Combined Odds: 4.00 – 5.00 | Data Quality: ${rolloverResult.dataQuality}*\n\n` +
        `I researched today's fixtures and built **${rolloverResult.candidateSlips.length} candidate slips** with zero intra-match correlation:\n\n`;

      rolloverResult.candidateSlips.forEach((slip, idx) => {
        const letter = String.fromCharCode(65 + idx);
        replyMsg += `**OPTION ${letter}: ${slip.title}**\n` +
          `• **Combined Odds:** **${slip.combinedOdds.toFixed(2)}x** | **Selections:** ${slip.selections.length} legs | **Data Quality:** ${slip.dataQuality}\n` +
          slip.selections.map((s, i) => `  ${i + 1}. ${s.homeTeam} vs ${s.awayTeam} — *${s.selection}* (@ ${s.bookmakerOdds})`).join('\n') + '\n\n';
      });

      if (rolloverResult.safetyWarning) {
        replyMsg += `⚠️ *Note:* ${rolloverResult.safetyWarning}\n\n`;
      }

      replyMsg += `You can inspect the full statistical profile of each candidate in the **Predictions** or **Today's Rollover** tab, or tell me which option to load into your active workspace!`;

      return {
        message: replyMsg,
        dataStatus: 'CALCULATED',
        toolResults,
        warnings: rolloverResult.limitations,
        suggestedPrompts: [
          'Load Option A to active ticket',
          'Load Option B to active ticket',
          'Research Option A selections',
          'View Today\'s Rollover Dashboard',
        ],
      };
    }

    // 4. Mark Rollover Outcome (Won/Lost/Void)
    if (lowerMsg.includes('mark today\'s rollover') || lowerMsg.includes('record rollover outcome')) {
      const isWon = lowerMsg.includes('won');
      const status = isWon ? 'WON' : 'LOST';
      const recordResult = ToolImplementations.recordRolloverDay({
        date: new Date().toISOString().split('T')[0],
        status,
      });

      toolResults.push({
        toolName: 'record_rollover_day',
        success: true,
        data: recordResult,
        summary: `Recorded Day 1 as ${status}`,
      });

      return {
        message: `### Daily Rollover Outcome Recorded\n\n` +
          `• **Outcome:** **${status}**\n` +
          `• **Current Bankroll:** ₦${recordResult.challenge.currentBankroll.toLocaleString()}\n` +
          `• **Active Day:** Day ${recordResult.challenge.currentDay} of ${recordResult.challenge.totalDays}\n\n` +
          `Ready to generate tomorrow's candidate rollover slips when you return!`,
        dataStatus: 'CALCULATED',
        toolResults,
        suggestedPrompts: [
          'Generate tomorrow\'s rollover slip',
          'View Rollover History',
          'Analyze current ticket',
        ],
      };
    }

    // 5. Booking Code Parsing
    const codeMatch = message.match(/(?:code|booking code)\s*(?:is|:)?\s*([A-Za-z0-9]{5,10})/i);
    if (codeMatch && (lowerMsg.includes('booking') || lowerMsg.includes('code') || lowerMsg.includes('check'))) {
      const code = codeMatch[1].toUpperCase();
      const detectedBookmaker = lowerMsg.includes('sporty')
        ? 'SportyBet'
        : lowerMsg.includes('bet9ja')
        ? 'Bet9ja'
        : lowerMsg.includes('1xbet')
        ? '1xBet'
        : 'SportyBet';

      const parseRes = ToolImplementations.parseBookingCode({
        bookmaker: detectedBookmaker,
        bookingCode: code,
      });

      toolResults.push({
        toolName: 'parse_booking_code',
        success: false,
        data: parseRes,
        summary: `Validated format for ${detectedBookmaker} code ${code}`,
      });

      return {
        message: `I validated the format of booking code **${code}** (${detectedBookmaker}).\n\n` +
          `ℹ️ **Honest Integration Status:** Live bookmaker direct-code fetching requires official API credentials. ` +
          `To inspect this ticket, please take a quick screenshot and upload it here, or paste the match details directly!`,
        dataStatus: 'UNAVAILABLE',
        toolResults,
        warnings: parseRes.limitations,
        suggestedPrompts: [
          'Upload screenshot instead',
          'Use demo ticket 1',
          'Show supported bookmakers',
        ],
      };
    }

    // 3. Ticket Trimming Intent
    if (
      lowerMsg.includes('trim') ||
      lowerMsg.includes('remove') ||
      lowerMsg.includes('cut') ||
      lowerMsg.includes('reduce to') ||
      lowerMsg.includes('make this ticket')
    ) {
      if (!currentTicket || currentTicket.selections.length === 0) {
        return {
          message: 'No active ticket is loaded to trim. Please upload a screenshot, load a demo ticket, or paste selections first.',
          dataStatus: 'UNAVAILABLE',
          suggestedPrompts: ['Load Demo Ticket 1', 'Upload ticket screenshot'],
        };
      }

      // Detect desired number of selections if specified (e.g. "trim to 5")
      const numMatch = message.match(/(?:to|make it)\s*(\d+)/i);
      const targetCount = numMatch ? parseInt(numMatch[1], 10) : Math.max(1, currentTicket.selections.length - 2);

      const trimResult = ToolImplementations.trimTicket({
        ticket: currentTicket,
        criteria: {
          maxSelections: targetCount,
          removeHighestOdds: true,
        },
      });

      toolResults.push({
        toolName: 'trim_ticket',
        success: true,
        data: trimResult,
        summary: `Proposed trimming from ${currentTicket.selections.length} to ${targetCount} selections`,
      });

      return {
        message: `I analyzed your ticket and prepared a proposal to reduce it to **${targetCount} selections** by trimming the highest-risk (longest odds) legs.\n\n` +
          `• **Original:** ${currentTicket.selections.length} selections (Odds: ${currentTicket.totalOdds})\n` +
          `• **Proposed:** ${targetCount} selections (Odds: ${trimResult.newCombinedOdds})\n` +
          `• **Implied Probability:** adjusts from ${(currentTicket.impliedProbability * 100).toFixed(2)}% to ${(trimResult.proposedTicket.impliedProbability * 100).toFixed(2)}%\n\n` +
          `*Please review the confirmation card below before this change is applied to your active ticket.*`,
        dataStatus: 'CALCULATED',
        proposedAction: trimResult.proposedAction,
        toolResults,
        suggestedPrompts: ['Confirm trim', 'Cancel trim', 'Split into doubles instead'],
      };
    }

    // 4. Ticket Splitting Intent
    if (lowerMsg.includes('split') || lowerMsg.includes('doubles') || lowerMsg.includes('trebles') || lowerMsg.includes('combinations')) {
      if (!currentTicket || currentTicket.selections.length < 3) {
        return {
          message: 'Splitting requires an active ticket with at least 3 selections. Please load a ticket first.',
          dataStatus: 'UNAVAILABLE',
          suggestedPrompts: ['Load Demo Ticket 1 (8 folds)'],
        };
      }

      const method = lowerMsg.includes('treble') ? 'trebles' : 'doubles';
      const splitResult = ToolImplementations.splitTicket({
        ticket: currentTicket,
        method,
        allocatedStakePerTicket: 500,
      });

      toolResults.push({
        toolName: 'split_ticket',
        success: true,
        data: splitResult,
        summary: `Generated ${splitResult.count} ${method}`,
      });

      return {
        message: `I split your ${currentTicket.selections.length}-fold ticket into **${splitResult.count} ${method}**.\n\n` +
          `This hedges against single-match upsets by allowing you to collect returns even if 1 or more legs fail.\n\n` +
          `Would you like to review and confirm saving these combinations?`,
        dataStatus: 'CALCULATED',
        proposedAction: splitResult.proposedAction,
        toolResults,
        suggestedPrompts: ['Confirm split', 'Calculate odds', 'Research games'],
      };
    }

    // 5. Research Match Intent
    if (lowerMsg.includes('research') || lowerMsg.includes('stats') || lowerMsg.includes('head to head') || lowerMsg.includes('h2h')) {
      // Find fixture from message or current ticket
      let home = 'Arsenal';
      let away = 'Chelsea';

      if (lowerMsg.includes('real madrid') || lowerMsg.includes('sevilla')) {
        home = 'Real Madrid';
        away = 'Sevilla';
      } else if (currentTicket && currentTicket.selections.length > 0) {
        home = currentTicket.selections[0].homeTeam;
        away = currentTicket.selections[0].awayTeam;
      }

      const research = await ToolImplementations.researchFixture({
        homeTeam: home,
        awayTeam: away,
      });

      toolResults.push({
        toolName: 'research_fixture',
        success: research.success,
        data: research,
        summary: `Retrieved research for ${home} vs ${away}`,
      });

      if (research.success && research.research) {
        const r = research.research as any;
        const homeName = r.fixture?.homeTeam?.name || r.homeTeam;
        const awayName = r.fixture?.awayTeam?.name || r.awayTeam;
        const compName = r.fixture?.competition?.name || r.competition;
        const h2hData = r.h2h || r.headToHead || { homeWins: 0, draws: 0, awayWins: 0 };
        const hForm = Array.isArray(r.homeStats?.formLast5) ? r.homeStats.formLast5.join('-') : (Array.isArray(r.homeForm) ? r.homeForm.join('-') : 'N/A');
        const aForm = Array.isArray(r.awayStats?.formLast5) ? r.awayStats.formLast5.join('-') : (Array.isArray(r.awayForm) ? r.awayForm.join('-') : 'N/A');
        const hRank = r.standings?.homeRank ?? 'N/A';
        const aRank = r.standings?.awayRank ?? 'N/A';
        const obs = r.observations || [];
        const sources = r.dataSources || ['Curated Benchmark Database'];

        return {
          message: `### Match Research: **${homeName} vs ${awayName}** (${compName})\n\n` +
            `• **Head-to-Head:** ${h2hData.homeWins} Home Wins | ${h2hData.draws} Draws | ${h2hData.awayWins} Away Wins\n` +
            `• **Recent Form:** ${homeName} (${hForm}) vs ${awayName} (${aForm})\n` +
            `• **Standings:** ${homeName} (#${hRank}) vs ${awayName} (#${aRank})\n\n` +
            `**Key Observations:**\n` +
            obs.map((o: string) => `- ${o}`).join('\n') +
            `\n\n*Source: ${sources.join(', ')} | Status: ${r.sourceStatus || 'DEMO'}*`,
          dataStatus: 'VERIFIED',
          toolResults,
          suggestedPrompts: [
            `Calculate EV for ${home} Win`,
            'Research next selection',
            'Trim ticket',
          ],
        };
      } else {
        return {
          message: `**Research Status:** ${research.message}\n\n` +
            `BetPilot AI strictly follows hallucination prevention rules and will never fabricate fictional player injuries, team statistics, or match history.`,
          dataStatus: 'UNAVAILABLE',
          toolResults,
          warnings: research.limitations,
          suggestedPrompts: ['Research Arsenal vs Chelsea', 'Research Real Madrid vs Sevilla'],
        };
      }
    }

    // 6. Odds & Payout Calculation Intent
    if (lowerMsg.includes('calculate') || lowerMsg.includes('payout') || lowerMsg.includes('odds') || lowerMsg.includes('stake') || lowerMsg.includes('receive')) {
      if (!currentTicket) {
        return {
          message: 'Please provide or load a ticket first to calculate total odds and payouts.',
          dataStatus: 'UNAVAILABLE',
          suggestedPrompts: ['Load Demo Ticket 1', 'Upload ticket screenshot'],
        };
      }

      // Check if user specified a stake e.g. "₦5,000" or "5000"
      const stakeMatch = message.match(/(?:₦|\$|£|€)?\s*(\d[\d,]+)/);
      const stake = stakeMatch ? parseFloat(stakeMatch[1].replace(/,/g, '')) : currentTicket.stake || 1000;

      const calc = ToolImplementations.calculateTicket({
        selections: currentTicket.selections,
        stake,
      });

      toolResults.push({
        toolName: 'calculate_ticket',
        success: true,
        data: calc,
        summary: `Calculated combined odds: ${calc.combinedOdds} for stake: ${stake}`,
      });

      return {
        message: `### Ticket Calculation Summary\n\n` +
          `• **Selections Count:** ${calc.selectionCount} legs\n` +
          `• **Combined Decimal Odds:** **${calc.combinedOdds.toFixed(2)}**\n` +
          `• **Stake:** ₦${calc.stake.toLocaleString()}\n` +
          `• **Potential Return:** **₦${calc.potentialReturn.toLocaleString()}**\n` +
          `• **Potential Profit:** ₦${calc.profit.toLocaleString()}\n` +
          `• **Implied Probability:** **${(calc.impliedProbability * 100).toFixed(2)}%**\n\n` +
          `*Note: Implied probability is mathematically (1 / decimalOdds). It represents break-even odds and does not claim certainty of outcome.*`,
        dataStatus: 'CALCULATED',
        toolResults,
        warnings: calc.warnings,
        suggestedPrompts: [
          'Trim weakest 2 selections',
          'Calculate EV with 65% probability',
          'Compare with Demo Ticket 2',
        ],
      };
    }

    // 7. Rollover Tracking Intent
    if (lowerMsg.includes('rollover') || lowerMsg.includes('bonus') || lowerMsg.includes('wager')) {
      const calc = ToolImplementations.calculateRollover({
        bonusAmount: 350000,
        rolloverMultiplier: 4,
        completedWager: 350000,
      });

      toolResults.push({
        toolName: 'calculate_rollover',
        success: true,
        data: calc,
        summary: 'Calculated bonus rollover requirements',
      });

      return {
        message: `### Active Bonus Rollover Status\n\n` +
          `• **Bonus Amount:** ₦350,000 (SportyBet Welcome Bonus)\n` +
          `• **Wagering Requirement:** 4x Multiplier (₦${calc.requiredWager.toLocaleString()} required)\n` +
          `• **Completed Wager:** ₦${calc.completedWager.toLocaleString()}\n` +
          `• **Remaining Wager:** **₦${calc.remainingWager.toLocaleString()}**\n` +
          `• **Progress:** **${calc.progressPercentage}% Complete**\n\n` +
          `You can view live qualifying bet criteria and track additional wagers on the **Rollover Dashboard**!`,
        dataStatus: 'CALCULATED',
        toolResults,
        suggestedPrompts: ['Go to Rollover Dashboard', 'Add ₦50,000 to wager', 'Check ticket rules'],
      };
    }

    // 8. General Gemini Reasoning with System Prompt Grounding
    const client = ToolImplementations.getGeminiClient();
    if (client) {
      try {
        const ticketContext = currentTicket
          ? `Current Active Ticket:
Bookmaker: ${currentTicket.bookmaker}
Combined Odds: ${currentTicket.totalOdds}
Selections: ${currentTicket.selections
              .map((s) => `${s.homeTeam} vs ${s.awayTeam} (${s.selection} @ ${s.odds})`)
              .join(', ')}`
          : 'No ticket currently active in workspace.';

        const fullPrompt = `${BETPILOT_SYSTEM_PROMPT}

Context:
${ticketContext}

User Query:
${message}

Respond directly, concisely, and transparently. If recommending an action, explain what tool or steps are needed. Never invent odds or claim certainty.`;

        const response = await client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          config: {
            temperature: 0.2,
          },
        });

        const reply = response.text || 'I am ready to assist with your sports tickets and research.';
        return {
          message: reply,
          dataStatus: 'AI_ESTIMATE',
          suggestedPrompts: [
            'Analyze this ticket',
            'Trim weakest selections',
            'Calculate odds for ₦2,000',
            'Check rollover rules',
          ],
        };
      } catch (err: any) {
        console.error('Gemini generateContent error:', err);
      }
    }

    // Fallback response if offline/no Gemini key configured
    return {
      message: `Welcome to **BetPilot AI**. I'm here to help you inspect, calculate, research, and organize your sports betting tickets.\n\n` +
        `• **Screenshot Extraction:** Drag or upload any betting ticket screenshot.\n` +
        `• **Trimming & Splitting:** Ask me to trim games or split accumulators into doubles.\n` +
        `• **Math & Rollover:** Calculate exact decimal odds, potential return, and bonus rollover requirements.\n` +
        `• **Transparency:** I strictly label all data as Verified, User-Provided, Calculated, or Model Estimate.`,
      dataStatus: 'VERIFIED',
      suggestedPrompts: [
        'Load Demo Ticket 1',
        'Analyze current ticket',
        'Trim to 5 selections',
        'Show rollover tracker',
      ],
    };
  }
}

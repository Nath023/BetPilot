import { BookmakerCapability, Ticket, Selection } from '../../shared/types/index.ts';
import { REGISTERED_BOOKMAKERS, MARKET_TRANSLATION_MAP } from '../../shared/constants/bookmakers.ts';

export class BookmakerRegistry {
  private static providers: BookmakerCapability[] = REGISTERED_BOOKMAKERS;

  public static getAll(): BookmakerCapability[] {
    return this.providers;
  }

  public static getById(bookmakerId: string): BookmakerCapability | undefined {
    const clean = (bookmakerId || '').toLowerCase().trim();
    return this.providers.find((p) => p.id === clean || p.name.toLowerCase() === clean);
  }

  public static validateBookingCode(bookmakerId: string, bookingCode: string): {
    isValidFormat: boolean;
    reason?: string;
  } {
    const provider = this.getById(bookmakerId);
    if (!provider) {
      return { isValidFormat: false, reason: `Unknown bookmaker: ${bookmakerId}` };
    }

    if (provider.bookingCodePattern) {
      const regex = new RegExp(provider.bookingCodePattern, 'i');
      const matches = regex.test(bookingCode.trim());
      if (!matches) {
        return {
          isValidFormat: false,
          reason: `Code "${bookingCode}" does not match standard ${provider.name} format (${provider.notes || 'alphanumeric pattern'})`,
        };
      }
    }

    return { isValidFormat: true };
  }

  public static convertTicket(
    ticket: Ticket,
    targetBookmakerId: string
  ): {
    success: boolean;
    convertedTicket?: Ticket;
    unsupportedSelections: Selection[];
    warnings: string[];
    requiresExternalValidation: boolean;
  } {
    const targetProvider = this.getById(targetBookmakerId);
    if (!targetProvider) {
      return {
        success: false,
        unsupportedSelections: ticket.selections,
        warnings: [`Target bookmaker "${targetBookmakerId}" is not registered.`],
        requiresExternalValidation: true,
      };
    }

    const sourceKey = `${ticket.bookmaker.toLowerCase()}_to_${targetBookmakerId.toLowerCase()}`;
    const map = MARKET_TRANSLATION_MAP[sourceKey] || {};

    const convertedSelections: Selection[] = [];
    const unsupportedSelections: Selection[] = [];
    const warnings: string[] = [];

    ticket.selections.forEach((sel) => {
      const mappedSelection = map[sel.selection] || map[sel.market];
      if (mappedSelection) {
        convertedSelections.push({
          ...sel,
          id: `conv-${sel.id}`,
          selection: mappedSelection,
          notes: `Converted from ${ticket.bookmaker} (${sel.selection}) to ${targetProvider.name} (${mappedSelection})`,
        });
      } else {
        // Semantic preservation fallback with warning
        convertedSelections.push({
          ...sel,
          id: `conv-${sel.id}`,
          notes: `Target market mapped verbatim: review on ${targetProvider.name}`,
        });
        warnings.push(
          `Market "${sel.market}" - "${sel.selection}" for ${sel.homeTeam} vs ${sel.awayTeam} requires manual verification on ${targetProvider.name}.`
        );
      }
    });

    const convertedTicket: Ticket = {
      ...ticket,
      id: `converted-${Date.now()}`,
      bookmaker: targetProvider.name,
      bookingCode: undefined, // Clear code since target bookmaker requires code generation
      title: `${ticket.title || 'Ticket'} (Converted to ${targetProvider.name})`,
      selections: convertedSelections,
      updatedAt: new Date().toISOString(),
    };

    warnings.push(
      `Booking code cleared: Official code generation for ${targetProvider.name} is not connected to a live verified booking engine.`
    );

    return {
      success: true,
      convertedTicket,
      unsupportedSelections,
      warnings,
      requiresExternalValidation: true,
    };
  }
}

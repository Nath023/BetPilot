/**
 * TeamAliasResolver: Resolves divergent team names across sportsbooks and statistics APIs
 * into canonical team identities.
 */
export class TeamAliasResolver {
  private static aliases: Map<string, string> = new Map([
    // Premier League
    ['arsenal fc', 'Arsenal'],
    ['chelsea fc', 'Chelsea'],
    ['liverpool fc', 'Liverpool'],
    ['everton fc', 'Everton'],
    ['manchester united', 'Man United'],
    ['manchester united fc', 'Man United'],
    ['man utd', 'Man United'],
    ['manchester city', 'Man City'],
    ['manchester city fc', 'Man City'],
    ['man city', 'Man City'],
    ['tottenham hotspur', 'Tottenham'],
    ['tottenham hotspur fc', 'Tottenham'],
    ['spurs', 'Tottenham'],

    // La Liga
    ['real madrid cf', 'Real Madrid'],
    ['fc barcelona', 'Barcelona'],
    ['barca', 'Barcelona'],
    ['club atletico de madrid', 'Atletico Madrid'],
    ['atletico madrid', 'Atletico Madrid'],
    ['athletic club', 'Athletic Bilbao'],
    ['athletic bilbao', 'Athletic Bilbao'],
    ['sevilla fc', 'Sevilla'],

    // Bundesliga
    ['fc bayern munchen', 'Bayern Munich'],
    ['bayern munchen', 'Bayern Munich'],
    ['fc bayern munich', 'Bayern Munich'],
    ['borussia dortmund', 'Borussia Dortmund'],
    ['bvb 09', 'Borussia Dortmund'],
    ['bayer 04 leverkusen', 'Bayer Leverkusen'],
    ['bayer leverkusen', 'Bayer Leverkusen'],

    // Serie A
    ['inter milan', 'Inter Milan'],
    ['fc internazionale milano', 'Inter Milan'],
    ['internazionale', 'Inter Milan'],
    ['ac milan', 'AC Milan'],
    ['juventus fc', 'Juventus'],
    ['ssc napoli', 'Napoli'],
    ['as roma', 'AS Roma'],
    ['acf fiorentina', 'Fiorentina'],

    // Ligue 1
    ['paris saint-germain', 'PSG'],
    ['paris saint germain', 'PSG'],
    ['paris sg', 'PSG'],
    ['olympique de marseille', 'Marseille'],
    ['olympique lyonnais', 'Lyon'],
  ]);

  /**
   * Normalizes a team name to its canonical representation.
   */
  public static resolve(rawName: string): string {
    if (!rawName) return '';
    const clean = rawName
      .toLowerCase()
      .trim()
      .replace(/[\.\-_]/g, ' ')
      .replace(/\s+/g, ' ');

    if (this.aliases.has(clean)) {
      return this.aliases.get(clean)!;
    }

    // Strip common generic suffixes: FC, CF, AFC, SC, SSC, SV
    const stripped = clean
      .replace(/\b(fc|cf|afc|sc|ssc|sv)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (this.aliases.has(stripped)) {
      return this.aliases.get(stripped)!;
    }

    // Capitalize words if no alias exists
    return rawName
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .trim();
  }

  /**
   * Checks if two team names match after alias normalization.
   */
  public static matches(nameA: string, nameB: string): boolean {
    const canonicalA = this.resolve(nameA).toLowerCase();
    const canonicalB = this.resolve(nameB).toLowerCase();
    return (
      canonicalA === canonicalB ||
      canonicalA.includes(canonicalB) ||
      canonicalB.includes(canonicalA)
    );
  }
}

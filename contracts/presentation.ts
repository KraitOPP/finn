import type { DecimalString, Delay, Freshness, Problem, QuoteResponse } from './generated/models.ts';

export function delayText(delay: Delay): string {
  switch (delay.kind) {
    case 'UNKNOWN': return 'Source delay unknown';
    case 'EOD': return 'End-of-day data';
    case 'DELAYED': return `Source-declared delay: ${delay.seconds} seconds`;
  }
}

export function freshnessText(freshness: Freshness): string {
  switch (freshness.state) {
    case 'FRESH': return 'Current for the expected completed session';
    case 'STALE': return 'Stale data';
    case 'UNKNOWN': return 'Freshness unknown';
    case 'NOT_APPLICABLE': return 'Freshness unavailable';
  }
}

export interface QuotePresentation {
  state: 'available' | 'unavailable' | 'restricted';
  value: DecimalString | undefined;
  valueText: string;
  volumeText: string;
  sourceText: string;
  delayText: string;
  freshnessText: string;
  sessionDate: string | null;
  observedAt: string | null;
  receivedAt: string | null;
  delaySeconds: number | null;
  frequency: 'End of day';
}

const unavailableReasons: Record<Exclude<QuoteResponse['availability'], 'AVAILABLE'>, string> = {
  NOT_YET_PUBLISHED: 'Not yet published',
  NO_TRADE: 'No traded observation',
  NOT_COVERED: 'Source does not cover this listing',
  TEMPORARILY_UNAVAILABLE: 'Temporarily unavailable',
  INVALID_DATA: 'Source data requires review',
  UNKNOWN: 'Availability unknown',
};

// Public-mode suppression is defence in depth. Backend source rights and ownership
// checks still control what may be served; this mapping does not confer rights.
export function quotePresentation(response: QuoteResponse, mode: 'private' | 'public-demo' = 'public-demo'): QuotePresentation {
  const observation = response.availability === 'AVAILABLE' ? response.observation : null;
  const knownMode = mode === 'private' || mode === 'public-demo';
  const allowed = knownMode && (mode === 'private' || !observation || (observation.provenance.provider === 'SYNTHETIC'
    && observation.provenance.rights.mode === 'SYNTHETIC_PUBLIC_DEMO'
    && observation.provenance.rights.publicDisplayAllowed === true));
  const empty: QuotePresentation = {
    state: allowed ? 'unavailable' : 'restricted',
    value: undefined,
    valueText: allowed ? 'Unavailable' : 'Unavailable in public demonstration',
    volumeText: 'Unavailable',
    sourceText: 'No eligible observation',
    delayText: 'Source delay unknown',
    freshnessText: freshnessText(response.freshness),
    sessionDate: null,
    observedAt: null,
    receivedAt: null,
    delaySeconds: null,
    frequency: 'End of day',
  };
  if (!allowed) return empty;
  if (!observation) return { ...empty, sourceText: unavailableReasons[response.availability as Exclude<QuoteResponse['availability'], 'AVAILABLE'>] };
  const provenance = observation.provenance;
  return {
    state: 'available',
    value: observation.close,
    valueText: `${observation.listing.currency} ${observation.close}`,
    volumeText: observation.volume ?? 'Unavailable',
    sourceText: provenance.provider === 'SYNTHETIC' ? 'Synthetic demonstration' : provenance.sourceName,
    delayText: delayText(provenance.delay),
    freshnessText: freshnessText(response.freshness),
    sessionDate: observation.sessionDate,
    observedAt: provenance.times.observedAt,
    receivedAt: provenance.times.firstSeenAt,
    delaySeconds: provenance.delay.seconds,
    frequency: 'End of day',
  };
}

// Local presentation policy, not a portfolio API DTO. A future portfolio contract
// must map server-verified coverage to this policy; market-price history alone is
// insufficient to establish an investor's historical return.
export function historicalReturnPresentation(
  value: DecimalString | null,
  history: 'verified-complete' | 'holdings-only' | 'partial' | 'unknown',
): { value: DecimalString | undefined; text: string } {
  if (history !== 'verified-complete' || value === null) {
    return { value: undefined, text: 'Unavailable: sufficient transaction and valuation history required' };
  }
  return { value, text: `${value}%` };
}

export function problemPresentation(problem: Problem): { title: string; detail: string; traceId: string } {
  return { title: problem.title, detail: problem.detail, traceId: problem.traceId };
}

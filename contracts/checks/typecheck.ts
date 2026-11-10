import { decodeContract } from '../decode.ts';
import type { DecimalString, Delay, QuoteResponse } from '../generated/models.ts';

// These compile-only checks make a widened/incorrect generated contract fail tsc.
// They do not create application fixtures or run network requests.
export function typedConsumer(payload: unknown): string | undefined {
  const quote: QuoteResponse = decodeContract('QuoteResponse', payload);
  if (quote.availability === 'AVAILABLE') return quote.observation.close;
  // @ts-expect-error Unavailable observations must be null, not a present price.
  return quote.observation.close;
}

export const decimalText: DecimalString = '123.450000000000000001';
// @ts-expect-error Financial JSON numbers must not substitute for decimal strings.
export const binaryNumber: DecimalString = 123.45;
// @ts-expect-error Unknown upstream delay must retain null rather than zero seconds.
export const falseZeroDelay: Delay = { kind: 'UNKNOWN', seconds: 0, basis: 'UNKNOWN' };
// @ts-expect-error A fabricated live provider mode is outside the EOD contract.
export const falseLiveDelay: Delay = { kind: 'LIVE', seconds: 0, basis: 'SOURCE_DECLARED' };

export function typedProblem(payload: unknown): string {
  return decodeContract('Problem', payload).traceId;
}

// SovPort — parse a presentation request (scanned QR payload or deep link).
//
// A verifier shows a QR that the holder scans. To stay tolerant of how the
// verifier encodes it, three shapes are accepted:
//   sovport://present?sessionId=…&challenge=…
//   https://<any-host>/present?sessionId=…&challenge=…
//   {"sessionId":"…","challenge":"…"}          (raw JSON)
//
// Pure (no platform APIs), so it unit-tests in plain Node and is shared by the
// deep-link route and the in-app scanner.

export type PresentRequest = {
  sessionId: string;
  challenge: string;
};

function decodeComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

/** Parse `a=1&b=2` (URL query or deep-link query) into a plain map. */
function parseQuery(query: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
    out[decodeComponent(rawKey)] = decodeComponent(rawValue);
  }
  return out;
}

/**
 * Extract `{ sessionId, challenge }` from a scanned QR payload or deep link.
 * Returns null when the payload is not a presentation request or is missing
 * either required field.
 */
export function parsePresentRequest(input: string): PresentRequest | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Raw JSON payload.
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      const sessionId = typeof obj.sessionId === 'string' ? obj.sessionId : '';
      const challenge = typeof obj.challenge === 'string' ? obj.challenge : '';
      return sessionId && challenge ? { sessionId, challenge } : null;
    } catch {
      return null;
    }
  }

  // URL / deep link — only the query string carries the parameters.
  const questionMark = trimmed.indexOf('?');
  if (questionMark === -1) return null;

  const params = parseQuery(trimmed.slice(questionMark + 1));
  const sessionId = params.sessionId ?? '';
  const challenge = params.challenge ?? '';
  return sessionId && challenge ? { sessionId, challenge } : null;
}

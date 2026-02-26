/**
 * EMR-ART · BFL API CORS Proxy
 * Cloudflare Worker — free tier (100k req/day)
 *
 * Forwards all /v1/* requests to api.bfl.ai and adds
 * Access-Control-Allow-Origin so browsers can call the API directly.
 *
 * The x-key (BFL API key) is forwarded as-is — never stored or logged.
 */

const BFL_ORIGIN = 'https://api.bfl.ai';

// Restrict to your GitHub Pages origin in production.
// Change to '*' temporarily if you need to test from localhost.
const ALLOWED_ORIGIN = 'https://herman925.github.io';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // ── CORS preflight ─────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    // ── Proxy the request to BFL ───────────────────────────────────────────
    const targetUrl = BFL_ORIGIN + url.pathname + url.search;

    // Forward all headers except Host (Cloudflare sets it automatically)
    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.delete('host');

    let bflResponse;
    try {
      bflResponse = await fetch(targetUrl, {
        method:  request.method,
        headers: forwardHeaders,
        body:    request.method === 'GET' || request.method === 'HEAD'
                   ? undefined
                   : request.body,
        // Required for streaming bodies
        duplex: 'half',
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy fetch failed', detail: String(err) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
      });
    }

    // Re-stream the response body with CORS headers added
    const responseHeaders = new Headers(bflResponse.headers);
    const cors = corsHeaders(request);
    for (const [k, v] of Object.entries(cors)) {
      responseHeaders.set(k, v);
    }

    return new Response(bflResponse.body, {
      status:  bflResponse.status,
      headers: responseHeaders,
    });
  },
};

function corsHeaders(request) {
  // Echo back the request's Origin if it matches; otherwise use the allowed origin.
  const origin = request.headers.get('Origin') ?? '';
  const allow  = origin === ALLOWED_ORIGIN || origin.startsWith('http://localhost')
    ? origin
    : ALLOWED_ORIGIN;

  return {
    'Access-Control-Allow-Origin':  allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-key',
    'Access-Control-Max-Age':       '86400',
  };
}

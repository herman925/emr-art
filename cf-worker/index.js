/**
 * EMR-ART · BFL API CORS Proxy
 * Cloudflare Worker — free tier (100k req/day)
 *
 * Forwards requests to any *.bfl.ai subdomain and adds CORS headers.
 * The target host is read from the x-bfl-host header (defaults to api.bfl.ai).
 * The x-key (BFL API key) is forwarded as-is — never stored or logged.
 */

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

    // ── Determine target BFL host ──────────────────────────────────────────
    // Client sets x-bfl-host for regional polling URLs (e.g. api.us2.bfl.ai).
    // Defaults to api.bfl.ai for all other requests.
    const requestedHost = request.headers.get('x-bfl-host') ?? 'api.bfl.ai';

    // Security: only allow *.bfl.ai targets
    if (!requestedHost.endsWith('.bfl.ai')) {
      return new Response(JSON.stringify({ error: 'Invalid target host' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
      });
    }

    const targetUrl = `https://${requestedHost}${url.pathname}${url.search}`;

    // Forward all headers except Host and x-bfl-host (internal proxy header)
    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.delete('host');
    forwardHeaders.delete('x-bfl-host');

    let bflResponse;
    try {
      bflResponse = await fetch(targetUrl, {
        method:  request.method,
        headers: forwardHeaders,
        body:    request.method === 'GET' || request.method === 'HEAD'
                   ? undefined
                   : request.body,
        duplex: 'half',
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy fetch failed', detail: String(err) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
      });
    }

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
  const origin = request.headers.get('Origin') ?? '';
  const allow  = origin === ALLOWED_ORIGIN || origin.startsWith('http://localhost')
    ? origin
    : ALLOWED_ORIGIN;

  return {
    'Access-Control-Allow-Origin':  allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-key, x-bfl-host',
    'Access-Control-Max-Age':       '86400',
  };
}

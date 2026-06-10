/**
 * Brain Pie API Worker
 * Handles license validation and REST API for pie data access.
 *
 * Deploy:
 *   wrangler secret put GUMROAD_PRODUCT_ID
 *   wrangler deploy
 *
 * Required KV namespace (create with `wrangler kv:namespace create BRAIN_PIE_KV`):
 *   binding = "BRAIN_PIE_KV" in wrangler.toml
 *
 * Endpoints:
 *   POST /validate            — Gumroad license key validation
 *   POST /api/keys            — Generate (or rotate) an API key
 *   GET  /api/pies/:id        — Fetch a pie by ID
 *   PUT  /api/pies/:id        — Replace a pie's full JSON content
 */

const ALLOWED_ORIGIN = 'https://brainpie.app';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                    'Access-Control-Allow-Methods': 'GET, POST, PUT',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400',
                }
            });
        }

        // Route dispatch
        if (path === '/validate' && request.method === 'POST') {
            return handleLicenseValidation(request, env);
        }
        if (path === '/api/keys' && request.method === 'POST') {
            return handleGenerateKey(request, env);
        }
        const pieMatch = path.match(/^\/api\/pies\/([^/]+)$/);
        if (pieMatch) {
            const pieId = decodeURIComponent(pieMatch[1]);
            if (request.method === 'GET') return handleGetPie(request, env, pieId);
            if (request.method === 'PUT') return handlePutPie(request, env, pieId);
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders() });
    }
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function resolveUser(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7).trim();
    if (!token) return null;
    const entry = await env.BRAIN_PIE_KV.get('key:' + token, 'json');
    return entry ? { userId: entry.userId, token } : null;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleLicenseValidation(request, env) {
    let key;
    try {
        ({ key } = await request.json());
    } catch {
        return Response.json({ valid: false, error: 'Invalid request body' }, {
            status: 400,
            headers: corsHeaders()
        });
    }

    if (!key || typeof key !== 'string') {
        return Response.json({ valid: false }, { headers: corsHeaders() });
    }

    const gumroadResp = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            product_id: env.GUMROAD_PRODUCT_ID,
            license_key: key.trim(),
            increment_uses_count: 'false'
        })
    });

    const data = await gumroadResp.json();
    return Response.json(
        { valid: data.success === true },
        { headers: corsHeaders() }
    );
}

async function handleGenerateKey(request, env) {
    // If a valid existing key is provided, rotate it (new token, same userId).
    // Otherwise mint a fresh userId.
    let userId;
    const user = await resolveUser(request, env);
    if (user) {
        await env.BRAIN_PIE_KV.delete('key:' + user.token);
        userId = user.userId;
    } else {
        userId = crypto.randomUUID();
    }

    const token = crypto.randomUUID();
    await env.BRAIN_PIE_KV.put('key:' + token, JSON.stringify({ userId, createdAt: Date.now() }));

    return Response.json({ key: token, userId }, { headers: corsHeaders() });
}

async function handleGetPie(request, env, pieId) {
    const user = await resolveUser(request, env);
    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
    }

    const pie = await env.BRAIN_PIE_KV.get('pie:' + user.userId + ':' + pieId);
    if (pie === null) {
        return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders() });
    }

    return new Response(pie, {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
    });
}

async function handlePutPie(request, env, pieId) {
    const user = await resolveUser(request, env);
    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders() });
    }

    if (!Array.isArray(body.categories)) {
        return Response.json(
            { error: 'Invalid format: body must have a categories array' },
            { status: 400, headers: corsHeaders() }
        );
    }

    const json = JSON.stringify(body);
    await env.BRAIN_PIE_KV.put('pie:' + user.userId + ':' + pieId, json);

    return new Response(json, {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
    });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Content-Type': 'application/json'
    };
}

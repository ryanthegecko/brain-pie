/**
 * Brain Pie License Validation Worker
 * Deploy to Cloudflare Workers. Set GUMROAD_PRODUCT_ID as an environment variable.
 *
 * Deploy:
 *   npm create cloudflare@latest brain-pie-license
 *   wrangler secret put GUMROAD_PRODUCT_ID
 *   wrangler deploy
 *
 * Then paste the deployed workers.dev URL into License.WORKER_URL in app.js.
 */

const ALLOWED_ORIGINS = new Set([
    'https://brainpie.app',
    'http://localhost:8000',
]);

function getAllowedOrigin(request) {
    const origin = request.headers.get('Origin') || '';
    return ALLOWED_ORIGINS.has(origin) ? origin : 'https://brainpie.app';
}

export default {
    async fetch(request, env) {
        const origin = getAllowedOrigin(request);

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'POST',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            });
        }

        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        let key;
        try {
            ({ key } = await request.json());
        } catch {
            return new Response(JSON.stringify({ valid: false, error: 'Invalid request body' }), {
                status: 400,
                headers: corsHeaders(origin)
            });
        }

        if (!key || typeof key !== 'string') {
            return Response.json({ valid: false }, { headers: corsHeaders(origin) });
        }

        // Verify against Gumroad license API
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
            { headers: corsHeaders(origin) }
        );
    }
};

function corsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin,
        'Content-Type': 'application/json'
    };
}

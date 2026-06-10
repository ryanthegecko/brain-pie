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

const ALLOWED_ORIGIN = 'https://brainpie.app';

export default {
    async fetch(request, env) {
        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
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
                headers: corsHeaders(ALLOWED_ORIGIN)
            });
        }

        if (!key || typeof key !== 'string') {
            return Response.json({ valid: false }, { headers: corsHeaders(ALLOWED_ORIGIN) });
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
            { headers: corsHeaders(ALLOWED_ORIGIN) }
        );
    }
};

function corsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin,
        'Content-Type': 'application/json'
    };
}

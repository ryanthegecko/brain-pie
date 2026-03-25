# Brain Pie Pro — License System Setup

## Overview

Brain Pie Pro gates multiple pies behind a license key. Free users get one pie; Pro users get unlimited. License keys are issued by Gumroad on purchase and validated server-side by a Cloudflare Worker.

**Architecture:**
```
Customer pays on Gumroad
  → Gumroad emails license key (UUID)
  → Customer enters key in Brain Pie "Upgrade" modal
  → Brain Pie POSTs key to Cloudflare Worker
  → Worker verifies key against Gumroad API
  → Valid: key stored in localStorage, pro unlocked
```

---

## 1. Gumroad Product Setup

1. Create a new **Digital Product** on Gumroad
2. Set your price
3. In product settings, enable **"Generate a unique license key per sale"**
4. Note your **Product ID** from the product URL (e.g. `https://app.gumroad.com/products/XXXXX`)

Gumroad automatically emails the license key to the buyer — no webhook or extra config needed.

---

## 2. Cloudflare Worker Deployment

The worker source is at `worker.js` in this repo.

```sh
# Install Wrangler if needed
npm install -g wrangler
wrangler login

# Create a new Worker project
npm create cloudflare@latest brain-pie-license
# When prompted, paste in the contents of worker.js

# Set the Gumroad product ID as a secret (never committed to source)
wrangler secret put GUMROAD_PRODUCT_ID
# Paste your product ID when prompted

# Deploy
wrangler deploy
```

Note the deployed URL, e.g. `https://brain-pie-license.YOUR_SUBDOMAIN.workers.dev`

---

## 3. Wire Up the Worker URL

In `app.js`, replace the placeholder in the `License` object:

```js
WORKER_URL: 'https://brain-pie-license.YOUR_SUBDOMAIN.workers.dev/validate',
```

If you move to a custom domain, also update `ALLOWED_ORIGIN` in `worker.js`:

```js
const ALLOWED_ORIGIN = 'https://yourdomain.app';
```

---

## 4. Update the Gumroad Link

In `index.html`, replace the placeholder in the upgrade modal:

```html
<a class="license-buy-btn" href="https://YOUR_GUMROAD_LINK" ...>Get Pro →</a>
```

---

## Developer Bypass

To unlock Pro on your own device without a license key (persists across reloads):

```js
License.activateDev()
```

To revoke:

```js
License.deactivate()
```

---

## Testing Locally

| Scenario | Works locally? |
|---|---|
| Paywall gate (modal appears) | Yes — no Worker needed |
| Dev bypass (`License.activateDev()`) | Yes |
| Activate flow UI | Yes — any key "succeeds" (fail-open on network error) |
| Real Gumroad validation | Run `wrangler dev` locally, point `WORKER_URL` to `http://localhost:8787/validate` |

---

## Key Storage

| localStorage key | Value | Purpose |
|---|---|---|
| `brainPie_licenseKey` | UUID from Gumroad | Validated license key |
| `brainPie_pro` | `"true"` | Developer bypass flag |

---

## Revoking a License

In the Gumroad dashboard, find the sale and disable the license key. On the customer's next page load, `License.init()` will re-validate, get `valid: false`, clear `brainPie_licenseKey`, and lock them out.

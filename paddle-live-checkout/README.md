# Paddle Live Checkout on Cloudflare

## What this includes

- `site/`: static live checkout page for Cloudflare Pages
- `worker/`: webhook receiver for Paddle events on Cloudflare Workers

## Live Paddle IDs used

- Product (30): `pro_01khzt0kfb0aw2ct120bejtgcr`
- Product (90): `pro_01khzt0kmcp9wsd8xgk2yhcf0r`
- Product (180): `pro_01khzt0ksrrsm2b4r4hgrtm191`
- Product (280): `pro_01khzt0kyj1182b5n92b8zmbsw`
- Product (custom): `pro_01khzt0m5yp5862drxsrb03xh5`
- Price (30): `pri_01khz4yjp25njyd9hw0dvs2aj0`
- Price (90): `pri_01khz4yt8pwmzjzmzwy08g0b5z`
- Price (180): `pri_01khz4ytg9sy96hxyhxe1fxrvh`
- Price (280): `pri_01khz4ytcgm7f9xmfbjebeb747`
- Price (custom, min 5 max 420): `pri_01khz6h3paqn23tsdgkzmqangf`
- Client token ID: `ctkn_01jtreym53mted0qa2mxpz90wg` (set token value via environment, do not commit)

## Deploy

### 0) Cloudflare auth for Wrangler

Wrangler in this environment requires a token in non-interactive mode:

```bash
export CLOUDFLARE_API_TOKEN="your_cloudflare_api_token"
export CLOUDFLARE_ACCOUNT_ID="674e5e77a0d9bff86136ee6617c75ad0"
```

### 1) Pages site

```bash
npx wrangler pages deploy paddle-live-checkout/site --project-name paddle-live-checkout-site
```

### 2) Worker webhook

1. Set secrets for Worker:

```bash
cd paddle-live-checkout/worker
npx wrangler secret put PADDLE_WEBHOOK_SECRET
npx wrangler secret put PADDLE_CLIENT_TOKEN
```

2. Deploy:

```bash
cd paddle-live-checkout/worker
npx wrangler deploy
```

### 3) Paddle webhook URL (production)

Set your Paddle notification destination URL to:

`https://paddle-webhook-live.<your-subdomain>.workers.dev/webhook/paddle`

Current deployed Worker URL:

`https://paddle-webhook-live.okcasa27.workers.dev`

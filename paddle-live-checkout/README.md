# Paddle Sandbox Checkout on Cloudflare

## What this includes

- `site/`: static sandbox checkout page for Cloudflare Pages
- `worker/`: webhook receiver for Paddle events on Cloudflare Workers

## Sandbox Paddle IDs created

- Product (30): `pro_01khzt0kfb0aw2ct120bejtgcr`
- Product (90): `pro_01khzt0kmcp9wsd8xgk2yhcf0r`
- Product (180): `pro_01khzt0ksrrsm2b4r4hgrtm191`
- Product (280): `pro_01khzt0kyj1182b5n92b8zmbsw`
- Product (custom): `pro_01khzt0m5yp5862drxsrb03xh5`
- Price (30): `pri_01khzt0zkxeyxqyrw26z10hza0`
- Price (90): `pri_01khzt0zvb6wmjjz5wfpay3zgy`
- Price (180): `pri_01khzt0zyr2j5c8szmc0bj159z`
- Price (280): `pri_01khzt102fa2c34jwr9rxd6vj5`
- Price (custom, min 5 max 420): `pri_01khzt0zqn7c48rqsgw90sdkm3`
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

### 3) Paddle webhook URL

Set your Paddle notification destination URL to:

`https://paddle-webhook-live.<your-subdomain>.workers.dev/webhook/paddle`

Current deployed Worker URL:

`https://paddle-webhook-live.okcasa27.workers.dev`

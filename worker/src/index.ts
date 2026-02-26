export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  PADDLE_WEBHOOK_SECRET?: string;
  PADDLE_WEBHOOK_SECRET_V2?: string;
  PADDLE_CLIENT_TOKEN?: string;
}

const encoder = new TextEncoder();

const POLICY_PAGE_STYLE = `<style>
  body {
    margin: 0;
    padding: 28px;
    font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
    color: #111827;
    background: #f8fafc;
    line-height: 1.6;
  }
  main {
    max-width: 760px;
    margin: 0 auto;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 24px;
  }
  h1 { margin-top: 0; }
  h2 { margin-top: 24px; }
  a { color: #b91c1c; }
</style>`;

const TERMS_HTML = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Terms of Service</title>${POLICY_PAGE_STYLE}</head>
<body><main>
  <h1>Terms of Service</h1>
  <p>Legal business name: <strong>Allkinds</strong>.</p>
  <p>Effective date: February 19, 2026</p>
  <p>These terms govern your purchase and use of lead credits sold on this site.</p>
  <h2>1. Service</h2>
  <p>You are purchasing digital lead-credit units for use within our marketplace workflow.</p>
  <h2>2. Billing</h2>
  <p>Payments are processed by Paddle as merchant of record. Prices are displayed before checkout confirmation.</p>
  <h2>3. Acceptable use</h2>
  <p>You agree not to misuse purchased data, violate applicable law, or attempt unauthorized access to systems.</p>
  <h2>4. Support</h2>
  <p>For billing and account questions, contact: <a href="mailto:support@okcasa.live">support@okcasa.live</a>.</p>
</main></body></html>`;

const PRIVACY_HTML = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Privacy Notice</title>${POLICY_PAGE_STYLE}</head>
<body><main>
  <h1>Privacy Notice</h1>
  <p>Effective date: February 19, 2026</p>
  <p>We collect limited data needed to process checkout and deliver purchased credits.</p>
  <h2>1. Data we process</h2>
  <p>We may process transaction identifiers, customer identifiers, and purchase metadata from Paddle webhooks.</p>
  <h2>2. Payment data</h2>
  <p>Card and payment details are processed by Paddle. We do not store full payment card information.</p>
  <h2>3. Use of data</h2>
  <p>Data is used to confirm payment completion, fulfill purchases, and maintain basic fraud/security logs.</p>
  <h2>4. Contact</h2>
  <p>Privacy requests: <a href="mailto:privacy@okcasa.live">privacy@okcasa.live</a>.</p>
</main></body></html>`;

const REFUND_HTML = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Refund Policy</title>${POLICY_PAGE_STYLE}</head>
<body><main>
  <h1>Refund Policy</h1>
  <p>Legal business name: <strong>Allkinds</strong>.</p>
  <p>Effective date: February 19, 2026</p>
  <p>Allkinds follows Paddle Invoiced Consumer Terms and Conditions and Paddle's refund policy.</p>
  <p>Refunds are provided at the sole discretion of Paddle, on a case-by-case basis, and may be refused.</p>
  <p>Paddle may refuse a refund request where there is evidence of fraud, refund abuse, or manipulative behavior.</p>
  <p>This does not affect your statutory consumer rights for products that are not as described, faulty, or not fit for purpose.</p>
  <p>Where applicable under consumer cancellation rights, you may cancel within 14 days of the transaction in line with Paddle terms.</p>
  <p>To request a refund, contact <a href="mailto:billing@okcasa.live">billing@okcasa.live</a> and include your Paddle transaction ID and purchase email.</p>
</main></body></html>`;

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function verifyPaddleSignature(rawBody: string, signatureHeader: string | null, secret: string): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(';').map((segment) => {
      const [k, v] = segment.split('=');
      return [k?.trim(), v?.trim()];
    })
  ) as Record<string, string>;

  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const hex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return constantTimeEqual(hex, h1.toLowerCase());
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (
      request.method === 'GET' &&
      (url.pathname === '/' || url.pathname === '/checkout' || url.pathname === '/index.html')
    ) {
      const assetUrl = new URL(url.toString());
      assetUrl.pathname = '/index.html';
      const assetResp = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
      const html = await assetResp.text();
      const replaced = html.replaceAll('__PADDLE_CLIENT_TOKEN__', env.PADDLE_CLIENT_TOKEN || '');

      return new Response(replaced, {
        status: assetResp.status,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    }

    if (request.method === 'GET' && url.pathname === '/terms') {
      return new Response(TERMS_HTML, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    if (request.method === 'GET' && url.pathname === '/privacy') {
      return new Response(PRIVACY_HTML, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    if (request.method === 'GET' && url.pathname === '/refund') {
      return new Response(REFUND_HTML, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response('ok', { status: 200 });
    }

    if (request.method === 'POST' && url.pathname === '/webhook/paddle') {
      const rawBody = await request.text();
      const signature = request.headers.get('paddle-signature');

      const secret = env.PADDLE_WEBHOOK_SECRET_V2 || env.PADDLE_WEBHOOK_SECRET || '';
      const verified = await verifyPaddleSignature(rawBody, signature, secret);
      if (!verified) {
        return new Response('Invalid signature', { status: 401 });
      }

      const event = JSON.parse(rawBody) as {
        event_type?: string;
        data?: { id?: string; customer_id?: string };
      };

      console.log(
        JSON.stringify({
          eventType: event.event_type,
          transactionId: event.data?.id,
          customerId: event.data?.customer_id,
        })
      );

      return new Response('accepted', { status: 200 });
    }

    return env.ASSETS.fetch(request);
  },
};

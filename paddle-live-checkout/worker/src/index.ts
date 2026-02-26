export interface Env {
  PADDLE_WEBHOOK_SECRET?: string;
  PADDLE_WEBHOOK_SECRET_V2?: string;
  PADDLE_CLIENT_TOKEN?: string;
}

const encoder = new TextEncoder();
const CHECKOUT_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lead Credits Checkout</title>
  <script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
  <style>
    :root {
      --bg: radial-gradient(circle at 10% 10%, #fef3c7 0%, #fde68a 20%, #f8fafc 65%);
      --ink: #111827;
      --muted: #374151;
      --card: rgba(255, 255, 255, 0.88);
      --border: rgba(17, 24, 39, 0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
      color: var(--ink);
      background: var(--bg);
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      width: min(92vw, 560px);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 22px;
      padding: 28px;
      backdrop-filter: blur(8px);
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.16);
    }
    h1 { margin: 0 0 8px; font-size: clamp(1.5rem, 4vw, 2rem); }
    p { margin: 0 0 18px; color: var(--muted); line-height: 1.45; }
    .bundle {
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 18px;
      background: rgba(255, 255, 255, 0.85);
    }
    .price { font-size: 1.9rem; font-weight: 700; margin: 0; }
    .meta { margin: 6px 0 0; color: var(--muted); font-size: 0.95rem; }
    .preset-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin: 12px 0 10px;
    }
    .preset-btn {
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #ffffff;
      color: var(--ink);
      padding: 8px 6px;
      font-size: 0.84rem;
      font-weight: 700;
      cursor: pointer;
    }
    .preset-btn.active {
      background: #111827;
      color: #ffffff;
      border-color: #111827;
    }
    .qty-row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
    }
    .qty-row label { font-size: 0.88rem; color: #4b5563; font-weight: 700; }
    .qty-row input {
      width: 110px;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 1rem;
      font-weight: 700;
      color: var(--ink);
      background: rgba(255, 255, 255, 0.9);
    }
    #checkout-btn {
      appearance: none;
      width: 100%;
      border: 0;
      border-radius: 12px;
      padding: 14px;
      font-size: 1rem;
      font-weight: 700;
      background: linear-gradient(120deg, #ef4444, #f97316);
      color: white;
      cursor: pointer;
    }
    .status {
      margin-top: 12px;
      font-size: 0.93rem;
      color: #14532d;
      min-height: 1.2em;
    }
    .small { margin-top: 14px; font-size: 0.82rem; color: #6b7280; }
    footer {
      margin-top: 14px;
      border-top: 1px solid rgba(17, 24, 39, 0.12);
      padding-top: 12px;
      font-size: 0.84rem;
      color: #4b5563;
    }
    .legal {
      margin-top: 8px;
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      font-size: 0.84rem;
    }
    .legal a {
      color: #b91c1c;
      text-decoration: none;
      font-weight: 600;
    }
    .legal a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <main class="card">
    <h1>Buy Lead Credits</h1>
    <p><strong>Allkinds</strong> - official checkout page.</p>
    <p>Secure checkout powered by Paddle.</p>
    <section class="bundle" aria-label="Bundle details">
      <p class="price" id="display-price">$0.60</p>
      <p class="meta" id="display-meta">5 lead credits · one-time · $0.12 per lead</p>
      <div class="preset-grid" id="preset-grid">
        <button type="button" class="preset-btn" data-pack="p30">30</button>
        <button type="button" class="preset-btn" data-pack="p90">90</button>
        <button type="button" class="preset-btn" data-pack="p180">180</button>
        <button type="button" class="preset-btn" data-pack="p280">280</button>
        <button type="button" class="preset-btn active" data-pack="custom">Custom</button>
      </div>
      <div class="qty-row">
        <label for="qty-input">Lead quantity (min 5)</label>
        <input id="qty-input" type="number" min="5" step="1" value="5" />
      </div>
    </section>
    <button id="checkout-btn" type="button">Checkout Now</button>
    <div id="status" class="status"></div>
    <p class="small">Price ID: <code id="price-id-code">pri_01khz6h3paqn23tsdgkzmqangf</code></p>
    <footer>
      <div>Legal business name: Allkinds</div>
      <nav class="legal" aria-label="Legal policies">
        <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
        <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</a>
        <a href="/refund" target="_blank" rel="noopener noreferrer">Refund Policy</a>
      </nav>
    </footer>
  </main>
  <script>
    const CLIENT_TOKEN = "__PADDLE_CLIENT_TOKEN__";
    const UNIT_PRICE = 0.12;
    const MIN_QTY = 5;
    const PACKS = {
      p30: { priceId: "pri_01khz4yjp25njyd9hw0dvs2aj0", leads: 30, total: 3.5, meta: "30 lead pack · one-time" },
      p90: { priceId: "pri_01khz4yt8pwmzjzmzwy08g0b5z", leads: 90, total: 7.0, meta: "90 lead pack · one-time" },
      p180: { priceId: "pri_01khz4ytg9sy96hxyhxe1fxrvh", leads: 180, total: 15.35, meta: "180 lead pack · one-time" },
      p280: { priceId: "pri_01khz4ytcgm7f9xmfbjebeb747", leads: 280, total: 30.0, meta: "280 lead pack · one-time" },
      custom: { priceId: "pri_01khz6h3paqn23tsdgkzmqangf", leads: null, total: null, meta: "Custom leads · one-time · $0.12 per lead" },
    };
    const statusEl = document.getElementById("status");
    const button = document.getElementById("checkout-btn");
    const qtyInput = document.getElementById("qty-input");
    const qtyRow = document.querySelector(".qty-row");
    const displayPrice = document.getElementById("display-price");
    const displayMeta = document.getElementById("display-meta");
    const priceIdCode = document.getElementById("price-id-code");
    const presetButtons = Array.from(document.querySelectorAll(".preset-btn"));
    const params = new URLSearchParams(window.location.search);
    let selectedPack = "custom";

    function parseTypedQty(rawValue) {
      const raw = String(rawValue ?? "").trim();
      if (!raw) return null;
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }

    function normalizeQty(rawValue) {
      const parsed = parseTypedQty(rawValue);
      if (parsed === null) return MIN_QTY;
      return Math.max(MIN_QTY, parsed);
    }

    function formatMoney(value) {
      return "$" + Number(value).toFixed(2);
    }

    function renderCustomPreview(qty) {
      const total = (qty * UNIT_PRICE).toFixed(2);
      displayPrice.textContent = "$" + total;
      displayMeta.textContent = qty + " lead credits · one-time · $" + UNIT_PRICE.toFixed(2) + " per lead";
    }

    function commitQty() {
      const qty = normalizeQty(qtyInput.value);
      qtyInput.value = String(qty);
      if (selectedPack === "custom") {
        renderCustomPreview(qty);
      }
      return qty;
    }

    function renderSelectedPack() {
      const pack = PACKS[selectedPack];
      presetButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.pack === selectedPack));
      priceIdCode.textContent = pack.priceId;

      if (selectedPack === "custom") {
        qtyRow.style.display = "grid";
        commitQty();
        return;
      }

      qtyRow.style.display = "none";
      displayPrice.textContent = formatMoney(pack.total);
      displayMeta.textContent = pack.meta;
    }

    function setSelectedPack(packKey) {
      if (!PACKS[packKey]) return;
      selectedPack = packKey;
      renderSelectedPack();
    }

    const requestedLeads = parseTypedQty(params.get("leads"));
    const pkg = String(params.get("pkg") || "");
    const leadsToPack = { 30: "p30", 90: "p90", 180: "p180", 280: "p280" };
    const pkgToPack = { growth: "p90", pro: "p180", enterprise: "p280" };
    const packToPackageId = { p30: "standard", p90: "growth", p180: "pro", p280: "enterprise", custom: "custom" };
    const shouldAutoOpen =
      params.get("autostart") === "1" ||
      params.has("pkg") ||
      params.has("leads");
    let hasOpenedCheckout = false;

    if (shouldAutoOpen) {
      const card = document.querySelector(".card");
      if (card) card.style.display = "none";
      document.body.style.background = "#ffffff";
      document.body.style.padding = "0";
      document.body.style.minHeight = "100vh";
    }

    qtyInput.value = String(normalizeQty(requestedLeads));
    if (pkgToPack[pkg]) {
      selectedPack = pkgToPack[pkg];
    } else if (leadsToPack[requestedLeads]) {
      selectedPack = leadsToPack[requestedLeads];
    } else {
      selectedPack = "custom";
    }

    presetButtons.forEach((btn) => {
      btn.addEventListener("click", () => setSelectedPack(btn.dataset.pack));
    });

    qtyInput.addEventListener("input", () => {
      if (selectedPack !== "custom") return;
      const typed = parseTypedQty(qtyInput.value);
      if (typed === null) return;
      renderCustomPreview(typed);
    });
    qtyInput.addEventListener("blur", commitQty);
    renderSelectedPack();

    function openCheckout() {
      if (hasOpenedCheckout) return;
      hasOpenedCheckout = true;
      const pack = PACKS[selectedPack];
      const qty = selectedPack === "custom" ? commitQty() : 1;
      statusEl.textContent = "Opening checkout...";
      Paddle.Checkout.open({
        items: [{ priceId: pack.priceId, quantity: qty }],
        settings: {
          variant: "one-page",
          displayMode: "overlay",
          theme: "light",
          locale: "en"
        }
      });
    }

    if (!CLIENT_TOKEN) {
      statusEl.textContent = "Missing Paddle client token on Worker env (PADDLE_CLIENT_TOKEN).";
      button.disabled = true;
    } else {
      Paddle.Environment.set("production");
      Paddle.Initialize({
      token: CLIENT_TOKEN,
      eventCallback: (event) => {
        if (event.name === "checkout.error") {
          const message = event?.data?.message || "Checkout failed. Please retry.";
          const details = event?.data ? " :: " + JSON.stringify(event.data) : "";
          statusEl.textContent = message + details;
          console.error("Paddle checkout error", event);
          return;
        }
        if (event.name === "checkout.completed") {
          const txId = event.data?.transaction_id || "";
          statusEl.textContent = "Payment complete" + (txId ? " · " + txId : "");
          if (window.opener && !window.opener.closed) {
            const pack = PACKS[selectedPack];
            const qty = selectedPack === "custom" ? commitQty() : 1;
            const leads = selectedPack === "custom" ? qty : pack.leads;
            window.opener.postMessage(
              {
                type: "paddle:transaction.closed",
                transactionId: txId,
                priceId: pack.priceId,
                leads,
                packageId: packToPackageId[selectedPack] || "custom"
              },
              "*"
            );
          }
        }
      }
    });
    }

    button.addEventListener("click", openCheckout);

    if (shouldAutoOpen && CLIENT_TOKEN) {
      window.setTimeout(openCheckout, 120);
    }
  </script>
</body>
</html>`;

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

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/checkout')) {
      const checkoutHtml = CHECKOUT_HTML.replace(
        '__PADDLE_CLIENT_TOKEN__',
        env.PADDLE_CLIENT_TOKEN || ''
      );

      return new Response(checkoutHtml, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
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

    return new Response('Not found', { status: 404 });
  },
};

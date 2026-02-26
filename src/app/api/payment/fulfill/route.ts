import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const LEADS_PER_COMPLETED_PAYMENT = 30;
const AUTO_FULFILL_LOOKBACK_HOURS = 72;

const COMPLETED_TRANSACTION_STATUSES = new Set([
  'completed',
  'closed',
  'transaction_closed',
  'transaction.closed',
]);

const COMPLETED_WEBHOOK_EVENT_TYPES = new Set([
  'transaction.completed',
  'transaction_completed',
]);

const parseRequestedLeads = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(1, Math.floor(parsed));
};

const extractCustomerIds = (rows: any[]) => {
  const ids = rows
    .flatMap((row) => [
      typeof row?.customer_id === 'string' ? row.customer_id : null,
      typeof row?.paddle_customer_id === 'string' ? row.paddle_customer_id : null,
      typeof row?.id === 'string' && row.id.startsWith('ctm_') ? row.id : null,
    ])
    .filter((value): value is string => !!value);
  return Array.from(new Set(ids));
};

const isMissingColumnError = (err: any, columnName: string): boolean => {
  const message = String(err?.message || '').toLowerCase();
  const details = String(err?.details || '').toLowerCase();
  const hint = String(err?.hint || '').toLowerCase();
  const combined = `${message} ${details} ${hint}`;
  const col = columnName.toLowerCase();
  return (
    combined.includes(`column "${col}"`) ||
    combined.includes(`.${col} does not exist`) ||
    (String(err?.code || '') === '42703' && combined.includes(col))
  );
};

const pickString = (values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

const extractWebhookEventType = (eventRow: any): string =>
  String(
    pickString([
      eventRow?.event_type,
      eventRow?.type,
      eventRow?.eventType,
      eventRow?.name,
      eventRow?.payload?.event_type,
      eventRow?.payload?.type,
      eventRow?.payload?.eventType,
      eventRow?.payload?.name,
    ]) || ''
  ).toLowerCase();

const extractWebhookTransactionId = (eventRow: any): string | null =>
  pickString([
    eventRow?.transaction_id,
    eventRow?.payload?.transaction_id,
    eventRow?.payload?.id,
    eventRow?.payload?.data?.id,
    eventRow?.data?.id,
  ]);

const extractWebhookCustomerId = (eventRow: any): string | null =>
  pickString([
    eventRow?.customer_id,
    eventRow?.payload?.customer_id,
    eventRow?.payload?.data?.customer_id,
    eventRow?.payload?.data?.customer?.id,
    eventRow?.data?.customer_id,
    eventRow?.data?.customer?.id,
  ]);

const parseTimestamp = (value: unknown): number | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
};

const isRecentEnoughForAutoFulfill = (candidate: any): boolean => {
  const sourceTs = parseTimestamp(candidate?.updated_at) ?? parseTimestamp(candidate?.created_at);
  if (!sourceTs) return false;
  const maxAgeMs = AUTO_FULFILL_LOOKBACK_HOURS * 60 * 60 * 1000;
  return Date.now() - sourceTs <= maxAgeMs;
};

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = userRes.user.id;
    const requestedLeads = LEADS_PER_COMPLETED_PAYMENT;
    const requestedTransactionId = typeof body?.transactionId === 'string' ? body.transactionId : '';
    const packageId = typeof body?.packageId === 'string' ? body.packageId : null;

    if (requestedLeads < 1 || requestedLeads > 1000 || parseRequestedLeads(body?.requestedLeads) < 1) {
      return NextResponse.json({ error: 'Invalid lead count.' }, { status: 400 });
    }

    let customerRows: any[] | null = null;
    let customerErr: any = null;

    const byUserIdRes = await supabaseAdmin
      .from('paddle_customers')
      .select('*')
      .eq('user_id', userId);

    if (!byUserIdRes.error) {
      customerRows = byUserIdRes.data;
    } else if (isMissingColumnError(byUserIdRes.error, 'user_id')) {
      const userEmail = String(userRes.user.email || '').trim().toLowerCase();
      if (!userEmail) {
        return NextResponse.json({ error: 'Unable to map payment customer: user email missing.' }, { status: 409 });
      }

      const byEmailRes = await supabaseAdmin
        .from('paddle_customers')
        .select('*')
        .eq('email', userEmail);

      customerRows = byEmailRes.data;
      customerErr = byEmailRes.error;
    } else {
      customerErr = byUserIdRes.error;
    }

    if (customerErr) {
      return NextResponse.json({ error: `Unable to map payment customer: ${customerErr.message}` }, { status: 500 });
    }

    const customerIds = extractCustomerIds(customerRows || []);
    if (customerIds.length === 0) {
      return NextResponse.json({ error: 'No Paddle customer mapping found for this user.' }, { status: 409 });
    }

    let txQuery = supabaseAdmin
      .from('paddle_transactions')
      .select('id, status, customer_id, created_at, updated_at')
      .in('customer_id', customerIds)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (requestedTransactionId) {
      txQuery = txQuery.eq('id', requestedTransactionId);
    }

    const { data: txRows, error: txErr } = await txQuery;
    if (txErr) {
      return NextResponse.json({ error: `Unable to verify transaction: ${txErr.message}` }, { status: 500 });
    }
    const completedTransactions = (txRows || [])
      .filter((tx: any) =>
        COMPLETED_TRANSACTION_STATUSES.has(String(tx?.status || '').toLowerCase())
      )
      .filter((tx: any) => requestedTransactionId ? true : isRecentEnoughForAutoFulfill(tx));

    if (completedTransactions.length === 0) {
      let webhookRows: any[] | null = null;
      let webhookErr: any = null;

      const orderedWebhookRes = await supabaseAdmin
        .from('paddle_webhook_events')
        .select('*')
        .order('processed_at', { ascending: false })
        .limit(200);

      if (!orderedWebhookRes.error) {
        webhookRows = orderedWebhookRes.data;
      } else {
        const plainWebhookRes = await supabaseAdmin
          .from('paddle_webhook_events')
          .select('*')
          .limit(200);
        webhookRows = plainWebhookRes.data;
        webhookErr = plainWebhookRes.error;
      }

      // If webhook mirror table is unavailable in this environment, keep existing behavior.
      if (!webhookErr && Array.isArray(webhookRows)) {
        const derivedTransactions = webhookRows
          .filter((row: any) => COMPLETED_WEBHOOK_EVENT_TYPES.has(extractWebhookEventType(row)))
          .map((row: any) => ({
            id: extractWebhookTransactionId(row),
            customer_id: extractWebhookCustomerId(row),
          }))
          .filter(
            (row): row is { id: string; customer_id: string | null } =>
              typeof row.id === 'string' && row.id.length > 0
          )
          .filter((row) => !requestedTransactionId || row.id === requestedTransactionId)
          .filter((row) => {
            if (!row.customer_id) return true;
            return customerIds.includes(row.customer_id);
          })
          .map((row) => ({
            id: row.id,
            status: 'completed',
            customer_id: row.customer_id || null,
            created_at: null as string | null,
            updated_at: null as string | null,
          }));

        if (derivedTransactions.length > 0) {
          completedTransactions.push(...derivedTransactions);

          // Best-effort mirror into paddle_transactions for faster future lookups.
          for (const tx of derivedTransactions) {
            if (!tx.customer_id) continue;
            try {
              await supabaseAdmin
                .from('paddle_transactions')
                .upsert(
                  {
                    id: tx.id,
                    customer_id: tx.customer_id,
                    status: 'completed',
                  },
                  { onConflict: 'id' }
                );
            } catch {
              // ignore sync failures for fallback mirror
            }
          }
        }
      }
    }

    if (completedTransactions.length === 0) {
      return NextResponse.json({ error: 'No completed transaction found yet for this account.' }, { status: 409 });
    }

    let selectedTransaction = completedTransactions[0];
    for (const tx of completedTransactions) {
      const { data: existingFulfillment } = await supabaseAdmin
        .from('paddle_fulfillments')
        .select('id')
        .eq('transaction_id', tx.id)
        .maybeSingle();
      if (!existingFulfillment) {
        selectedTransaction = tx;
        break;
      }
    }

    const { data: existingFulfillment } = await supabaseAdmin
      .from('paddle_fulfillments')
      .select('id')
      .eq('transaction_id', selectedTransaction.id)
      .maybeSingle();
    if (existingFulfillment) {
      return NextResponse.json({
        granted: false,
        reason: 'already_fulfilled',
        transactionId: selectedTransaction.id,
      }, { status: 200 });
    }

    const { data: availableLeads, error: availableErr } = await supabaseAdmin
      .from('marketplace_leads')
      .select('*')
      .eq('status', 'available')
      .is('assigned_to', null)
      .limit(requestedLeads);

    if (availableErr) {
      return NextResponse.json({ error: availableErr.message }, { status: 500 });
    }
    if (!availableLeads || availableLeads.length < requestedLeads) {
      return NextResponse.json({ error: 'Not enough available inventory to fulfill this order.' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const leadRows = availableLeads.slice(0, requestedLeads).map((lead: any) => ({
      user_id: userId,
      business_name: lead.business_name,
      contact_name: lead.contact_name,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
      website: lead.website,
      business_type: lead.business_type,
      lead_status: 'new',
      status: 'New',
      color: 'bg-stone-100 text-stone-600',
      last_contact: 'Never',
      scheduled_date: '-',
    }));

    const { data: insertedLeads, error: insertErr } = await supabaseAdmin
      .from('leads')
      .insert(leadRows)
      .select('id');
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    const leadIds = (insertedLeads || []).map((lead: any) => lead.id);
    if (leadIds.length > 0) {
      const { error: dispensedErr } = await supabaseAdmin
        .from('dispensed_leads')
        .insert(leadIds.map((leadId: string) => ({ user_id: userId, lead_id: leadId })));
      if (dispensedErr) {
        return NextResponse.json({ error: dispensedErr.message }, { status: 500 });
      }
    }

    const marketplaceIds = availableLeads.slice(0, requestedLeads).map((lead: any) => lead.id);
    const { error: marketErr } = await supabaseAdmin
      .from('marketplace_leads')
      .update({ status: 'assigned', assigned_to: userId, assigned_at: now })
      .in('id', marketplaceIds);
    if (marketErr) {
      return NextResponse.json({ error: marketErr.message }, { status: 500 });
    }

    const { error: fulfillmentErr } = await supabaseAdmin
      .from('paddle_fulfillments')
      .insert({
        transaction_id: selectedTransaction.id,
        user_id: userId,
        lead_count: leadIds.length,
        package_id: packageId,
      });
    if (fulfillmentErr) {
      return NextResponse.json({ error: fulfillmentErr.message }, { status: 500 });
    }

    return NextResponse.json({
      granted: true,
      leadCount: leadIds.length,
      transactionId: selectedTransaction.id,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

-- Stripe subscriptions can also be 'paused' (via pause_collection) — a
-- status our original check constraint didn't allow for. Extend it rather
-- than mapping 'paused' onto an existing value, so the webhook sync (see
-- lib/billing/webhook-sync.ts) can always write Stripe's status verbatim.

alter table public.subscriptions drop constraint subscriptions_status_check;

alter table public.subscriptions add constraint subscriptions_status_check
  check (status in (
    'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due',
    'canceled', 'unpaid', 'paused'
  ));

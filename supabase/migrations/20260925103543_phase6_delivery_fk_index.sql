create index if not exists notification_deliveries_push_token_idx
  on public.notification_deliveries (push_token_id);

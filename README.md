# Sampling For Good Organization — request intake

This branch adds an organization request form to the existing four-screen PWA. Each request is submitted to `/api/requests`, stored in Supabase, and optionally forwarded to n8n for an acknowledgment through Gmail. **No shipment, donation, sponsor verification, or inventory reservation takes place.**

## Setup
1. In Supabase, run `supabase/schema.sql` using SQL Editor. The `sampling_requests` table has RLS enabled without public policies.
2. Configure Vercel environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only). Never commit secrets or include service role credentials in frontend files.
3. Set the Vercel framework to Other and output directory to `public`, with repository root as project root.
4. Configure n8n with a production POST webhook, ideally path `samplingforgood-received`. Reject requests unless the `x-sfg-secret` header matches your shared secret, then send Gmail acknowledgment to `{{$json.body.email}}` with the request ID and disclaimer that delivery is not scheduled.
5. Set `N8N_SFG_WEBHOOK_URL` and `N8N_SFG_SHARED_SECRET` in Vercel. Activate the n8n workflow and redeploy Vercel.
6. Test end-to-end: submit through the UI, verify a row in Supabase, and check n8n execution and Gmail sent mail.

**Limitations:** Email is required for this phase; phone is optional, stored, and never used for SMS. An `emailStatus` of `queued` only means n8n accepted the webhook, not that Gmail delivered a message. Prior to public launch, implement rate limits/bot protection, privacy and retention policies, failure retries, and monitoring. Catalog brands are illustrative and not verified partnerships.

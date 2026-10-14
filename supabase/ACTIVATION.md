# Supabase activation — Sampling For Good Distribution

The application contains a server-only Supabase REST insert for `public.sfg_distribution_requests`. The web browser never receives the service-role key.

## Connect the correct project

1. Open the Supabase project intended to hold organization sampling requests.
2. In **SQL Editor**, execute `supabase/migrations/20261014_sfg_distribution_requests.sql` and verify `public.sfg_distribution_requests` exists with RLS enabled.
3. In Vercel project `samplingforgood-b5ld`, add **Production** environment variables:
   - `SUPABASE_URL`: the project API URL, `https://<project-ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: the secret server-side service-role key for this same project, entered as **Secret**.
4. Redeploy production.
5. Submit one real test and verify the new row in Supabase **Table Editor → sfg_distribution_requests** and the existing notification email at `samples@iconx.io`.

Do not place the service-role key in `public/`, browser JavaScript, GitHub, screenshots, or chat.

## Important current behavior

Until both environment variables are present, requests continue via existing Resend email, with **no database persistence**. Once both variables are configured, the endpoint **requires** successful Supabase storage before sending the team notification. If Supabase is unavailable, users see a retry message; their requests are not silently accepted. The current system does not yet send an automated acknowledgment to the person submitting. Gmail/n8n integration is a separate step.

The database retains request IDs, organizations, contacts, requested brands, quantity, shipping date, charity and notes. No direct brand integrations, fulfillment, donation settlement, SMS, or HubSpot are configured.

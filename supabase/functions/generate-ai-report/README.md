# Deploying `generate-ai-report`

This is the first Edge Function in this project — nothing else here has ever
needed a place to hold a secret server-side. One-time setup:

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>   # find this in your Supabase project URL/settings
```

Then, every time this function's code changes:

```bash
supabase functions deploy generate-ai-report
```

Set the LLM keys once (these never touch the frontend `.env` files — they live
only in Supabase's function secrets, which the browser bundle can't reach):

```bash
supabase secrets set GROQ_API_KEY=your-groq-key
supabase secrets set GEMINI_API_KEY=your-gemini-key   # optional — Groq-only works, this is just the fallback
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by
Supabase into every Edge Function — do not set those yourself.

## Testing it directly

```bash
curl -X POST 'https://<your-project-ref>.functions.supabase.co/generate-ai-report' \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"studentUuid":"<a real student UUID>","source":"on_demand"}'
```

Expect one of: a full report, `{"insufficientData":true,...}` if the student
doesn't have enough recorded assessment data yet, or `{"cooldownActive":true,...}`
if one was already generated in the last 24 hours.

# Silicon Career Intelligence

India-first semiconductor/VLSI job aggregation MVP. Stack: React + Vite, Supabase PostgreSQL, GitHub Actions, Vercel.

## What's included

- Responsive job feed, search, filters, save-to-browser, source registry and job-submission form.
- Supabase schema with public read-only active jobs, pending submissions and collection logs.
- Scheduled collector for permitted public Greenhouse and Lever job-board APIs.
- Source registry entries for company career portals, LinkedIn Jobs, Naukri and two WhatsApp channels.
- WhatsApp Channel 1: manual/history import workflow; Channel 2: future-only policy. Neither channel is automatically read; WhatsApp does not expose a general public API for arbitrary channel history.
- Sample cards are clearly marked demo data. They are not actual vacancies.

## 1. Run locally

Install Node.js 20 or newer. In this folder run:

```bash
npm install
npm run dev
```

The site runs in demo mode until Supabase is configured.

## 2. Create Supabase database

1. Create a Supabase project on its free tier.
2. Open SQL Editor in the Supabase dashboard.
3. Paste and run all of `supabase/schema.sql`.
4. In Project Settings / API, copy the Project URL and the publishable/anon key.
5. Create `.env.local` from `.env.example` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
6. Restart `npm run dev`. Active jobs will load from Supabase. If no live jobs have been collected yet, the database feed will be empty.

Never put the Supabase service-role key in `.env.local`, Vite variables, frontend code or GitHub files. The service-role key belongs only in GitHub Actions secrets.

## 3. Deploy on GitHub + Vercel

1. Create a new GitHub repository, e.g. `silicon-career-intelligence`.
2. Upload/push all files from this project root. Include `.github/workflows/collect-jobs.yml`.
3. In Vercel, choose **Add New → Project**, import the GitHub repository, and use the defaults for Vite (`npm run build`, output `dist`).
4. Add these Vercel Environment Variables for Production (and Preview if desired):
   - `VITE_SUPABASE_URL` = Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = Supabase publishable/anon key
5. Deploy. After changing environment variables, redeploy.

## 4. Enable scheduled collection

In GitHub repository → Settings → Secrets and variables → Actions, add:

- `SUPABASE_URL`: Supabase Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key from Supabase API settings. Keep this private.
- `SOURCES_JSON`: a JSON array of approved public ATS board identifiers. Example format (replace values with real board identifiers after verifying the employer's board):

```json
[
  {"type":"greenhouse","token":"VERIFIED_GREENHOUSE_BOARD_TOKEN","company":"Example Semiconductor Employer","source_url":"https://boards.greenhouse.io/VERIFIED_GREENHOUSE_BOARD_TOKEN"},
  {"type":"lever","token":"VERIFIED_LEVER_SITE_NAME","company":"Example Semiconductor Employer","source_url":"https://jobs.lever.co/VERIFIED_LEVER_SITE_NAME"}
]
```

Do not use placeholder tokens as real sources. A source should be added only after confirming the employer's official board identifier and that its public API is appropriate to use. The collector currently implements only Greenhouse and Lever. Other career sites remain external links until a permitted adapter is built and tested.

Then go to **Actions → Collect semiconductor jobs → Run workflow** to test. Inspect logs and Supabase `collection_runs` and `jobs` tables. The cron targets four runs per hour, but GitHub Actions can delay scheduled jobs. Source rate limits take priority.

## 5. How collection and deduplication work

- Stable key: `(source_id, external_job_id)`.
- Repeated feed records are upserted rather than inserted as duplicates.
- A successful complete fetch resets `missing_checks` for jobs that still exist.
- A job missing from one successful fetch remains active; after two successful missing checks it is marked `stale`, not automatically deleted.
- A failed fetch does not trigger expiry checks.
- `content_hash` tracks content changes.

This is intentionally conservative. Add stronger cross-source duplicate matching and explicit closed-job checks before scaling broadly.

## 6. WhatsApp, LinkedIn and Naukri notes

- The two WhatsApp channel URLs are registered in the database with separate history policies. Channel 2 is `future_only`. This is a policy flag, not an active channel-reading integration.
- Use the Submit a Job form for permitted, public job details and source URLs. Submissions remain pending; this MVP does not include an admin review console yet.
- LinkedIn and Naukri are represented as external search links. Automated import requires an authorized API, partner feed or permission. Do not scrape pages or bypass sign-in/access controls.

## 7. Security / production hardening before broad launch

- Add Supabase Auth and an admin-only review screen before accepting large volumes of submissions.
- Add rate limiting, CAPTCHA or moderation for public submissions.
- Validate and canonicalize URLs; protect against malicious links and HTML/script injection.
- Add email alert provider only after reviewing free-tier limits and sender verification requirements.
- Monitor quotas and source terms. ₹0 tiers do not guarantee unlimited operation or exact 15-minute execution.

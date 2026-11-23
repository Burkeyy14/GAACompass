# Going live: GAA Compass on Vercel + Supabase

About 30–45 minutes the first time. Everything here is free until you start charging for Pro.

You'll end up with:
- **https://your-app.vercel.app**: the app, installable on any phone
- **Supabase**: accounts (email + password) and the database
- **Beta codes** so friends get Pro free, and an **in-app feedback button** whose messages land in your database
- **Stripe** (optional, can be done later) for paid Pro

---

## 1. Supabase: database and accounts (10 min)

1. Go to **supabase.com** → sign up → **New project**. Pick region **West EU (Ireland)**. Save the database password somewhere safe.
2. **SQL Editor → New query** → paste the whole of `supabase/schema.sql` → **Run**. It should say "Success. No rows returned".
   - This creates the `records`, `entitlements` and `feedback` tables. Row Level Security means each player can only see their own data, and nobody can give themselves Pro.
3. **Project Settings → API**. Copy these three values for later:
   - **Project URL**
   - **anon public** key (safe to put in the app)
   - **service_role** key (**secret**: only ever goes into Vercel, never into the app code)

### Email: important for friends signing up
Supabase's built-in email only sends to members of your Supabase team. Friends' confirmation emails would **never arrive**. You have two options:

- **Quickest, fine for a beta:** **Authentication → Sign In / Providers → Email** → turn **off** "Confirm email". People can sign up and get straight in.
  - Password-reset emails still need option B to reach anyone who isn't on your Supabase team.
- **Proper fix (do this before a wider launch):** set up free custom email with **Resend** (resend.com, free tier).
  - In Resend, add and verify a domain. You'll need a domain, e.g. gaacompass.ie, about €10–15/year.
  - Then in Supabase: **Authentication → Emails → SMTP Settings** → enable custom SMTP with Resend's details (host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key).
  - Then turn "Confirm email" back on.

---

## 2. GitHub (5 min)

Create a new repository (e.g. `GAACompass-web`), then from this folder:

```bash
git init
git add .
git commit -m "GAA Compass web app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/GAACompass-web.git
git push -u origin main
```

`.env` files are git-ignored. Never commit your keys.

---

## 3. Vercel: hosting (10 min)

1. **vercel.com** → sign up with GitHub → **Add New… → Project** → import `GAACompass-web`.
2. Vercel detects **Vite** automatically. Leave the build settings as they are.
3. Before deploying, open **Environment Variables** and add:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_URL` | Supabase Project URL (same again; this one is for the server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (secret) |
| `BETA_CODES` | e.g. `DOORA2026,ULWOLVES` (codes that unlock Pro free) |
| `APP_URL` | leave for now; set it after the first deploy (step 5) |

4. **Deploy**. When it's done you get a URL like `gaa-compass-xyz.vercel.app`. You can rename it under **Settings → Domains**, e.g. `gaacompass.vercel.app`.
5. Set `APP_URL` to that URL (e.g. `https://gaacompass.vercel.app`) → **Deployments → … → Redeploy**.
6. Back in **Supabase → Authentication → URL Configuration**:
   - **Site URL**: `https://gaacompass.vercel.app`
   - **Redirect URLs**: add `https://gaacompass.vercel.app/**` (and `https://*-your-vercel-username.vercel.app/**` if you want preview deployments to work)

**Check it:** open `https://your-app.vercel.app/api/health`. You should see `"database": true` and `"betaCodes": true`.

---

## 4. Try it yourself

1. Open the site on your phone and create an account.
2. iPhone: Safari → Share → **Add to Home Screen**. Android: Chrome → **Install app**.
3. Avatar → **See Pro** → enter your beta code → Pro unlocks.
4. Tap **Beta · Feedback**, send a test message, then look in **Supabase → Table Editor → feedback**.

### Sharing with friends
Send them the link and a beta code, e.g.:

> Try my GAA training app: https://gaacompass.vercel.app. Add it to your home screen, make an account, and use code **DOORA2026** for free Pro. Hit "Beta · Feedback" at the top to tell me what you think.

You can change or add codes any time in Vercel's `BETA_CODES` (then redeploy). Removing a code doesn't take Pro away from people who already used it.

**Reading feedback:** Supabase → **Table Editor → feedback**, or SQL Editor: `select * from feedback_inbox;`

**Giving someone Pro by hand:** SQL Editor:
```sql
insert into entitlements (user_id, plan, source)
select id, 'pro', 'manual' from auth.users where email = 'friend@example.com'
on conflict (user_id) do update set plan = 'pro', source = 'manual';
```

---

## 5. Paid Pro with Stripe (optional; do this when you're ready to charge)

Do everything in **Test mode** first (toggle at the top right of the Stripe dashboard).

1. **stripe.com** → create an account.
2. **Product catalogue → Add product** → "GAA Compass Pro" → add two **recurring** prices, e.g. €3.99 monthly and €29.99 yearly. Copy both **price IDs** (`price_…`).
3. **Developers → API keys** → copy the **Secret key** (`sk_test_…`).
4. **Developers → Webhooks → Add endpoint**:
   - URL: `https://your-app.vercel.app/api/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Signing secret** (`whsec_…`).
5. **Settings → Billing → Customer portal** → activate it, and allow cancelling and switching between your two prices.
6. Add to Vercel env vars, then redeploy:

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `STRIPE_PRICE_MONTHLY` | monthly `price_…` |
| `STRIPE_PRICE_YEARLY` | yearly `price_…` |
| `VITE_PRICE_MONTHLY_LABEL` | `€3.99 / month` (just the text shown in the app) |
| `VITE_PRICE_YEARLY_LABEL` | `€29.99 / year` |

7. Test: in the app tap **Yearly**, then pay with card `4242 4242 4242 4242`, any future date, any CVC. You return to the app and Pro unlocks within a few seconds.
8. When it all works, repeat steps 2–6 in **Live mode** with the live keys.

Stripe charges a fee per transaction (check their current EU pricing). There's no monthly fee and no App Store cut.

---

## Running it on your computer

```bash
npm install
cp .env.example .env.local      # fill in the VITE_ values at least
npm run dev                     # app only, at http://localhost:5173
npx vercel dev                  # app + /api functions together (needs the Vercel CLI and the server env vars)
npm run check                   # type-check the app and the API
```

## What's where

```
api/                 Vercel serverless functions (server only)
  checkout.ts        start a Stripe subscription
  portal.ts          Stripe "manage subscription" page
  stripe-webhook.ts  keeps Pro in sync with Stripe
  redeem.ts          beta codes → Pro
  delete-account.ts  deletes a player and all their data
  health.ts          shows which settings are configured
supabase/schema.sql  tables + security rules
vercel.json          routing, caching and security headers
src/                 the app
```

## Before a public launch (beyond friends)
- Custom email (step 1B) and your own domain.
- A short **privacy policy** page. The app stores health-related training data (wellness, injuries), so GDPR applies. Get it checked.
- Supabase free projects pause after a week with no activity. Real users keep it awake, or upgrade when you grow.

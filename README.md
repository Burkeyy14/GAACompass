# GAA Compass

Training and injury-prevention web app for GAA players. It works in any browser on a PC, Android phone or iPhone, and installs to the home screen like a normal app (it's a PWA).

**Features**
- **Profile that drives the prescriptions**: age, sex, height, weight, sport, position, playing level, gym experience and injuries in the last 12 months.
  - Bodyweight sets estimated starting weights for every main lift.
  - Gym experience sets the number of sets and whether advanced lifts (cleans, drop jumps) appear.
  - Age: under-18s get technique-first loading and fewer extras; 30+ players get one fewer extra session plus calf/Achilles work.
  - A recent hamstring injury adds Nordics to every gym session, a longer warm-up and a slower build to top speed.
  - Position tunes conditioning distances and agility drills, and suggests goals.
  - **Dual player support**: pick two codes (e.g. hurling + football). Both teams' schedules are merged, the week is planned around all match days, and one fewer extra session is prescribed to allow recovery.
- **Goals → week-by-week plans**: Get quicker, Be more explosive, Get stronger, Build my fitness, Sharper on the turn (agility), Bulletproof hamstrings, Nail my frees, Sharpen my skills. Plans have 3-week builds with a deload every 4th week, and are placed around club nights and matches.
- **Body composition goal and nutrition tracking**: daily kcal, protein, carbs and fat targets from Mifflin–St Jeor BMR, adjusted for training load. No deficit on match day or the day before. Calorie floor safety rule. RED-S warning when consistent under-fuelling is detected. Log food manually or import a MyFitnessPal CSV export (no scraping, no API, completely offline). Weekly weigh-in prompt; weight trend chart on the Progress screen.
- **Guided workout player**: runs any prescribed session set by set, with a rest timer between sets (beep and vibration when rest ends), weight and rep steppers that remember last time's weights, timed holds, and skip/back controls. It keeps the screen on, asks for session RPE at the end, and logs everything.
- **Auto-regulation**: today's session adapts to the daily check-in (sleep, energy, soreness, stress, yesterday's effort, plus tightness/pain and where) and to load spikes. Tightness in a hamstring, groin, calf or quad means no sprinting that day.
- **Week planner**: logged sessions and finished workouts are ticked in automatically. It also has auto-plan, the FYP load score with red/amber rules, and per-day editing.
- **Quick log** for club training, matches and anything else. Load = minutes × RPE, with acute vs 4-week comparison and spike warnings.
- **Free-taking tracker**: the pitch runs out to your own 45 (football) or past your own 65 (hurling), and football shows the 2-point arc. It shows live distance on each tap and accuracy across 6 distance zones.
- **Benchmarks, progress charts**, all 32 county colours, light and dark mode, and a glass-style UI with a custom icon set.
- Accounts with cloud sync (Supabase), offline queueing, and a try-without-an-account mode.

## Going live

See **[DEPLOY.md](DEPLOY.md)** for step-by-step setup. It covers Supabase (accounts and database), Vercel (hosting and server functions), beta codes for friends, reading feedback, and Stripe for paid Pro.

Running costs to start: **€0** (Vercel Hobby, Supabase free tier). A custom domain is optional (~€10–25/year), and Stripe takes a fee per payment only.

**Free vs Pro.** Free: daily check-in, auto-adjusting training, injury and load warnings, week planner, workout player, free-taking tracker, 1 goal, nutrition tracking. Pro: multiple goals, strength tracker (e1RM and PBs), readiness insights, load-ratio trend, shot maps.

## Develop locally
```bash
npm install
cp .env.example .env.local   # add your Supabase keys (optional: without them it runs in local-only mode)
npm run dev                  # http://localhost:5173
npm run build                # production build in dist/
```

## Project layout
```
src/lib/recovery.ts    recovery score, readiness rules, explainer text
src/lib/load.ts        planner load score + flags, session load, acute vs 4-week comparison
src/lib/programs.ts    structured session library (sets/reps/rest), personalisation from the profile, goals, benchmarks
src/lib/generator.ts   goal → week-by-week plan, scheduling around matches, auto-regulation
src/lib/backend.ts     Supabase + offline queue / local-only mode
src/screens/*          Today, Check-in, Week planner, Train (workouts, frees, history), Player, Goals, Progress, Settings
src/components/Icon.tsx custom icon set
public/sw.js           service worker (offline + installable)
supabase/schema.sql    database tables + security policies
```

## Payments
Pro is sold as a Stripe subscription (monthly or yearly). Checkout, the customer portal and a signed webhook live in `api/`. Pro status is stored in the `entitlements` table, which players can read but never write. Paying on the web avoids the 15–30% App Store and Play Store cut. Setup is in DEPLOY.md, step 5.

## Safety
GAA Compass gives general training guidance, not medical advice. The "Bulletproof hamstrings" plan is for prevention. Anyone with a current injury should follow a physio's return-to-play plan first.

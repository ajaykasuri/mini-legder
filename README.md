# Mini Smart Ledger

A full-stack personal finance ledger built for the Bytex "Smart Mini-Ledger" challenge — JWT auth, transaction CRUD, categories, budgets with Discord alerts, CSV export, and a Smart Spending Insights engine, on a React + Express + MySQL stack.

## Stack

- **Frontend:** React (CRA), React Router, TanStack Query, Axios, React Hook Form, React Hot Toast, Recharts, hand-authored SVG icons
- **Backend:** Node.js, Express, JWT auth, bcrypt, MySQL (`mysql2/promise`), Redis (dashboard caching)
- **Notifications:** Discord webhook (budget alerts) + email via Nodemailer (spending-lock lockout notices) — both isolated behind a single function each, so the medium can be swapped without touching business logic

## Setup

### 1. Database

```bash
mysql -u root -p < backend/db/schema.sql
```

This creates the `mini_smart_ledger` database, tables, and the default income/expense categories.

### 2. Redis (optional but recommended)

```bash
redis-server   # or: docker run -p 6379:6379 redis
```

The app boots fine without Redis running — the dashboard just skips the cache and hits MySQL directly every time.

### 3. Backend

```bash
cd backend
cp .env.example .env   # fill in DB credentials, JWT_SECRET, REDIS_URL, DISCORD_WEBHOOK_URL, and SMTP_* vars
npm install
npm run dev
```

API runs on `http://localhost:5000` by default.

### 4. Frontend

```bash
cd frontend
cp .env.example .env   # points at the backend API
npm install
npm start
```

App runs on `http://localhost:3000`.

## Where the "smart" parts live

`backend/utils/insightsEngine.js` is a pure function that turns raw transaction rows into the natural-language insights shown on the dashboard (category month-over-month change, weekly spend spikes, largest expense, category share of spend, savings comparison). It's isolated from the DB layer on purpose, so it's testable without a database.

Budget alerts are debounced per category per month (`budget_alerts_sent` table) so a Discord channel doesn't get spammed every time a small transaction nudges an already-crossed threshold.

**Daily Spending Locks** (`backend/controllers/spendingLockController.js`, `frontend/src/components/OverrideModal`): a per-category daily cap that blocks a transaction the moment it goes strictly over the limit, requires the account password to override, lets the user choose how long the override lasts (one transaction / rest of today / next N), locks out further attempts after 3 wrong passwords for a cooldown period, and emails the account owner when that happens.

**Offline Queueing** (`frontend/src/hooks/useOfflineQueue.js`, `frontend/src/utils/offlineQueue.js`): transactions added while offline are queued in `localStorage` instead of failing outright, then auto-synced in order the moment the browser's `online` event fires. If a queued transaction turns out to violate the spending lock once it actually reaches the server, it's flagged "needs attention" in an Offline Queue panel rather than blocking the rest of the queue — the user resolves it manually, on their own time, using the same password-override modal.

**Redis caching** (`backend/utils/cache.js`): the dashboard summary and chart endpoints are cached per-user for 60 seconds and explicitly invalidated on every transaction create/update/delete, so a fresh add always shows correct numbers immediately — the cache only helps repeated dashboard loads in between edits.

---

## AI Usage

*(Replace this section with your own honest account before submitting — see the notes below on what to actually check.)*

**Tools used:** [e.g. Claude, GitHub Copilot — name what you actually used]

**What AI accelerated:** boilerplate (Express routing/middleware structure, CRUD scaffolding, CSS token setup), repetitive form/validation wiring, and first-draft copy for empty states and error messages.

**Where it fell short — things worth actually verifying before you write this section, because an AI-generated first pass commonly gets these wrong or leaves them unfinished:**
- **Budget alert de-duplication.** A naive implementation re-sends a Discord alert on every request once a threshold is crossed. Check whether the de-dup logic here actually works the way you'd want in production (e.g. what happens if a transaction is edited or deleted after an alert fires — the alert record isn't rolled back).
- **Race conditions on the unique constraint.** The `INSERT ... ON DUPLICATE KEY` and the alert-tracking table both lean on unique constraints rather than explicit locking. Under concurrent requests this is fine at this project's scale, but it's the kind of shortcut worth being able to explain.
- **CSV export loads the full filtered result set into memory** rather than streaming. Fine for a personal ledger, not fine at scale — worth deciding if you want to mention that tradeoff.
- **Category-based insights are naive.** The "35% increase" style comparisons are simple month-over-month percentage math, not seasonally adjusted or outlier-aware — one big one-off purchase can produce a misleading insight. Decide if that's acceptable or worth flagging/fixing.
- **No refresh-token flow.** JWTs are long-lived (7 days) with no rotation or revocation list. Reasonable for a challenge project; call it out explicitly rather than letting it look like an oversight.
- **Frontend error states are generic** in places (e.g. "Network error") rather than surfacing the specific backend message everywhere. Worth checking which flows do this and deciding if it matters.
- **The offline queue lives in `localStorage`, unencrypted.** A queued transaction's amount/category/description sits in plain text in the browser until it syncs. For a personal finance app that's a real thing to weigh — is that acceptable, or does it need at least a warning to the user?
- **Sync order isn't atomic.** If two browser tabs are open and both try to sync the same queue at once, or the user closes the tab mid-sync, an item could theoretically get submitted twice before `removeFromQueue` runs. Worth testing this deliberately (open two tabs, go offline, add a transaction, go online in both) rather than assuming it's fine.
- **The "slow connection" detector is a blunt instrument** — it flags "slow" off a single request's duration, not a rolling average, so one slow request right after a fast one can flicker the banner. Decide if that's good enough or needs smoothing.
- **Redis cache TTL (60s) was picked arbitrarily**, not derived from any actual measurement of how stale a dashboard number is acceptable to be. Worth having an opinion on whether that number is right for this use case.
- **No test coverage was written for the spending lock, offline queue, or caching logic** — these are the most state-dependent, edge-case-prone parts of the app, and also the parts with zero automated tests. That's worth being honest about rather than implying the app is more verified than it is.

Go through the app, break things on purpose, and see what you find beyond this list — that's the actual assignment. This list is a starting point for where to look, not a substitute for doing it.

**Unique twists:**
1. **Daily Spending Locks** — per-category daily caps with password re-authorization, selectable override scope, and a 3-strikes cooldown with an email alert.
2. **Offline Queueing with deferred conflict resolution** — transactions survive a dropped connection and sync automatically, with blocked items resolved individually instead of stalling the whole queue.

Be ready to explain *why* each design decision was made the way it was (strictly-over vs. at-the-limit, count-based vs. today-based overrides, why a blocked queue item doesn't halt the rest of the sync) — that reasoning is the actual point of this section, more than the feature existing at all.

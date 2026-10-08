# Hi-Fi Delivery Service – Delivery Fees & Daily Cash Flow

Next.js 14 (App Router, TypeScript) + Neon Postgres. No home page: `/` goes to login, then to the Admin or Rider dashboard.

## Setup (run each step, one at a time)
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` (from Neon), `AUTH_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
3. `npm run setup-db`  (creates the tables + your admin account; safe to re-run, it also resets the admin password)
4. `npm run dev`  → open http://localhost:3000
5. Log in as admin → **Riders** tab → add your delivery partners.

Admins can change their password from the **Admin Profile** tab in the dashboard. The current password is required to save a new password (minimum 8 characters).

Riders can submit, edit, and delete their own delivery notes from their dashboard; these are visible in the Admin **Rider Notes** tab and are not included in delivery or budget calculations. For an existing database, run `npm run migrate-delivery-notes` once to create the notes table without resetting the admin password. New databases get the table through `npm run setup-db`.

## Deploy to Netlify
1. Push this project to a GitHub, GitLab, or Bitbucket repository and import that repository in Netlify.
2. Netlify detects Next.js and uses its Next.js adapter. The included `netlify.toml` selects Node.js 20 and runs `npm run build`.
3. In **Site configuration → Environment variables**, add `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`. Optionally add `RIDER_SHARE_PERCENT` (defaults to `70`).
4. Run `npm run setup-db` once from your local project against the same Neon database to create the tables and initial admin account. For an existing database that does not have rider delivery notes yet, run `npm run migrate-delivery-notes` once instead.
5. Deploy the site from Netlify, then open the deployed URL and sign in with the configured admin credentials.

Do not add `npm run setup-db` to the Netlify build command: it resets the admin password on every deployment. Keep production secrets in Netlify environment variables, not in source files.

## Budget formula (same as your sheet)
- Total Collection = Petty Cash + Extra Cash + Cash Delivery Amount
- Online Transfer = sum of *Online Products Amount*
- Total Cash = Total Collection − Online Transfer
- Total Delivery = Online Delivery + Cash Delivery
- Rider Payment = 70% of Total Delivery (change with `RIDER_SHARE_PERCENT`)
- Cash in Hand Balance = Total Cash − Rider Payment

Dates use the local timezone of the machine running the app, so "today" follows that machine's calendar date.

The Admin dashboard's **Delivery Payment Summary** supports custom date ranges and daily, weekly, or monthly shortcuts. It shows the total delivery amount and rider payment using `RIDER_SHARE_PERCENT` (70% by default), and can export the selected date range and delivery partner to Excel.

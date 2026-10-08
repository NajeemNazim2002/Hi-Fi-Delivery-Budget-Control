import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL missing in .env.local"); process.exit(1); }
const sql = neon(process.env.DATABASE_URL);

const stmts = [
`CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','rider')),
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`CREATE TABLE IF NOT EXISTS deliveries (
  id SERIAL PRIMARY KEY,
  delivery_date DATE NOT NULL,
  rider_id INTEGER NOT NULL REFERENCES users(id),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash','online')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  delivery_location TEXT NOT NULL,
  delivery_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  extra_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  products_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`CREATE TABLE IF NOT EXISTS petty_cash (
  id SERIAL PRIMARY KEY,
  delivery_date DATE NOT NULL,
  rider_id INTEGER NOT NULL REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`CREATE TABLE IF NOT EXISTS rider_delivery_notes (
  id SERIAL PRIMARY KEY,
  delivery_date DATE NOT NULL,
  rider_id INTEGER NOT NULL REFERENCES users(id),
  delivery_location TEXT NOT NULL,
  delivery_amount NUMERIC(12,2) NOT NULL CHECK (delivery_amount >= 0),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash','online')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
`CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(delivery_date, rider_id)`,
`CREATE INDEX IF NOT EXISTS idx_petty_date ON petty_cash(delivery_date, rider_id)`,
`CREATE INDEX IF NOT EXISTS idx_rider_delivery_notes_date ON rider_delivery_notes(delivery_date, rider_id)`,
];

for (const s of stmts) await sql.query(s);

const username = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";
if (password.length < 6) { console.error("Set ADMIN_PASSWORD (min 6 chars) in .env.local"); process.exit(1); }
const hash = await bcrypt.hash(password, 10);
await sql.query(
  `INSERT INTO users (name, username, password_hash, role) VALUES ('Admin', $1, $2, 'admin')
   ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role='admin'`,
  [username, hash]
);
console.log("✅ Tables ready. Admin login ->", username);

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
await sql.query(`CREATE TABLE IF NOT EXISTS rider_delivery_notes (
  id SERIAL PRIMARY KEY,
  delivery_date DATE NOT NULL,
  rider_id INTEGER NOT NULL REFERENCES users(id),
  delivery_location TEXT NOT NULL,
  delivery_amount NUMERIC(12,2) NOT NULL CHECK (delivery_amount >= 0),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash','online')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);
await sql.query("CREATE INDEX IF NOT EXISTS idx_rider_delivery_notes_date ON rider_delivery_notes(delivery_date, rider_id)");
console.log("Rider delivery notes table ready.");

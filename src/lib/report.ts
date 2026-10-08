import { q } from "./db";
import { computeBudget } from "./budget";

const DEL_COLS = `d.id, to_char(d.delivery_date,'YYYY-MM-DD') AS delivery_date, d.rider_id, u.name AS rider_name,
  d.payment_type, d.customer_name, d.customer_phone, d.pickup_location, d.delivery_location,
  d.delivery_amount::float8 AS delivery_amount, d.extra_amount::float8 AS extra_amount,
  d.products_amount::float8 AS products_amount, d.created_at, d.updated_at`;
const PET_COLS = `p.id, to_char(p.delivery_date,'YYYY-MM-DD') AS delivery_date, p.rider_id, u.name AS rider_name,
  p.amount::float8 AS amount, p.note, p.created_at`;

export async function deliveriesBetween(from: string, to: string, riderId?: number) {
  const params: any[] = [from, to];
  let w = "d.delivery_date BETWEEN $1 AND $2";
  if (riderId) { params.push(riderId); w += " AND d.rider_id = $3"; }
  return q(`SELECT ${DEL_COLS} FROM deliveries d JOIN users u ON u.id=d.rider_id WHERE ${w} ORDER BY d.delivery_date, d.id`, params);
}
export async function pettyBetween(from: string, to: string, riderId?: number) {
  const params: any[] = [from, to];
  let w = "p.delivery_date BETWEEN $1 AND $2";
  if (riderId) { params.push(riderId); w += " AND p.rider_id = $3"; }
  return q(`SELECT ${PET_COLS} FROM petty_cash p JOIN users u ON u.id=p.rider_id WHERE ${w} ORDER BY p.delivery_date, p.id`, params);
}

/** Per-rider day report (deliveries + petty + budget) */
export async function dayReport(date: string, riderId?: number) {
  const [dels, pets] = await Promise.all([deliveriesBetween(date, date, riderId), pettyBetween(date, date, riderId)]);
  const riders = new Map<number, { rider_id: number; rider_name: string; deliveries: any[]; petty: any[] }>();
  const touch = (id: number, name: string) => {
    if (!riders.has(id)) riders.set(id, { rider_id: id, rider_name: name, deliveries: [], petty: [] });
    return riders.get(id)!;
  };
  dels.forEach((d) => touch(d.rider_id, d.rider_name).deliveries.push(d));
  pets.forEach((p) => touch(p.rider_id, p.rider_name).petty.push(p));
  return [...riders.values()]
    .sort((a, b) => a.rider_name.localeCompare(b.rider_name))
    .map((r) => ({ ...r, budget: computeBudget(r.deliveries, r.petty) }));
}

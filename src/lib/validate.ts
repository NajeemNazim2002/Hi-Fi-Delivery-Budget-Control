import { isValidDate, today } from "./date";

const money = (v: any) => { const n = Number(v); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN; };

export function parseDelivery(b: any): { error?: string; data?: any } {
  const payment_type = b.payment_type;
  if (payment_type !== "cash" && payment_type !== "online") return { error: "Choose cash or online payment" };
  const rider_id = Number(b.rider_id);
  if (!rider_id) return { error: "Select a delivery partner" };
  const t = (k: string) => String(b[k] ?? "").trim();
  const customer_name = t("customer_name"), customer_phone = t("customer_phone");
  const pickup_location = t("pickup_location"), delivery_location = t("delivery_location");
  if (!customer_name || !customer_phone || !pickup_location || !delivery_location)
    return { error: "Customer name, phone, pickup and delivery location are required" };
  if (!/^[0-9+\-\s()]{7,20}$/.test(customer_phone)) return { error: "Enter a valid phone number" };
  const delivery_amount = money(b.delivery_amount);
  if (isNaN(delivery_amount)) return { error: "Enter a valid delivery amount" };
  let extra_amount = 0, products_amount = 0;
  if (payment_type === "cash") {
    extra_amount = b.extra_amount === "" || b.extra_amount == null ? 0 : money(b.extra_amount);
    if (isNaN(extra_amount)) return { error: "Extra amount is invalid" };
  } else {
    products_amount = money(b.products_amount);
    if (isNaN(products_amount)) return { error: "Enter a valid online products amount" };
  }
  const delivery_date = b.delivery_date ? b.delivery_date : today();
  if (!isValidDate(delivery_date)) return { error: "Invalid date" };
  return { data: { payment_type, rider_id, customer_name, customer_phone, pickup_location, delivery_location,
    delivery_amount, extra_amount, products_amount, delivery_date } };
}
export { money };

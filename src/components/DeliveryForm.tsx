"use client";
import { useState } from "react";

type Props = {
  mode: "cash" | "online"; riders: any[]; date: string; initial?: any;
  onSaved: (r: { date: string; rider_id: number }) => void; onCancel?: () => void;
};

export default function DeliveryForm({ mode, riders, date, initial, onSaved, onCancel }: Props) {
  const blank = { rider_id: "", customer_name: "", customer_phone: "", pickup_location: "", delivery_location: "", delivery_amount: "", extra_amount: "", products_amount: "" };
  const [f, setF] = useState<any>(initial ? {
    rider_id: String(initial.rider_id), customer_name: initial.customer_name, customer_phone: initial.customer_phone,
    pickup_location: initial.pickup_location, delivery_location: initial.delivery_location,
    delivery_amount: String(initial.delivery_amount),
    extra_amount: initial.extra_amount ? String(initial.extra_amount) : "",
    products_amount: initial.products_amount ? String(initial.products_amount) : "",
  } : blank);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const body = { ...f, rider_id: Number(f.rider_id), payment_type: mode, delivery_date: initial?.delivery_date || date };
    const res = await fetch(initial ? `/api/admin/deliveries/${initial.id}` : "/api/admin/deliveries", {
      method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json(); setBusy(false);
    if (!res.ok) return setErr(j.error || "Failed to save");
    if (!initial) setF(blank);
    onSaved({ date: j.date, rider_id: j.rider_id });
  }

  return (
    <form onSubmit={submit}>
      <div className="grid">
        <div><label>Delivery Partner *</label>
          <select value={f.rider_id} onChange={set("rider_id")} required>
            <option value="">-- Select rider --</option>
            {riders.filter((r) => r.active || String(r.id) === f.rider_id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select></div>
        <div><label>Customer Name *</label><input value={f.customer_name} onChange={set("customer_name")} required /></div>
        <div><label>Customer Phone Number *</label><input type="tel" value={f.customer_phone} onChange={set("customer_phone")} required /></div>
        <div><label>Pickup Location Name *</label><input value={f.pickup_location} onChange={set("pickup_location")} required /></div>
        <div><label>Delivery Location Name *</label><input value={f.delivery_location} onChange={set("delivery_location")} required /></div>
        {mode === "cash" ? (<>
          <div><label>Delivery Cash Amount (statutory) *</label><input type="number" min="0" step="0.01" value={f.delivery_amount} onChange={set("delivery_amount")} required /></div>
          <div><label>Extra Amount (optional)</label><input type="number" min="0" step="0.01" value={f.extra_amount} onChange={set("extra_amount")} /></div>
        </>) : (<>
          <div><label>Online Delivery Amount *</label><input type="number" min="0" step="0.01" value={f.delivery_amount} onChange={set("delivery_amount")} required /></div>
          <div><label>Online Products Amount *</label><input type="number" min="0" step="0.01" value={f.products_amount} onChange={set("products_amount")} required /></div>
        </>)}
      </div>
      {err && <div className="msg err">{err}</div>}
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn" disabled={busy}>{busy ? "Saving..." : initial ? "Update Delivery" : "Assign Delivery"}</button>
        {onCancel && <button type="button" className="btn dark" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

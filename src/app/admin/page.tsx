"use client";
import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import BudgetCard from "@/components/BudgetCard";
import DeliveryForm from "@/components/DeliveryForm";
import DeliveryTable from "@/components/DeliveryTable";
import { today, prettyDate } from "@/lib/date";

type Tab = "assign" | "petty" | "deliveries" | "riderNotes" | "paymentSummary" | "budget" | "riders" | "profile" | "excel";
type SummaryPeriod = "daily" | "weekly" | "monthly" | "custom";

export default function Admin() {
  const [tab, setTab] = useState<Tab>("assign");
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>("daily");
  const [summaryFrom, setSummaryFrom] = useState(today());
  const [summaryTo, setSummaryTo] = useState(today());
  const [summaryRiderId, setSummaryRiderId] = useState("");
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [mode, setMode] = useState<"cash" | "online" | null>(null);
  const [date, setDate] = useState(today());
  const [riders, setRiders] = useState<any[]>([]);
  const [report, setReport] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [riderNotes, setRiderNotes] = useState<any[]>([]);
  const [riderNotesBusy, setRiderNotesBusy] = useState(false);
  const [riderNotesError, setRiderNotesError] = useState("");
  const [petty, setPetty] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [justSaved, setJustSaved] = useState<{ date: string; rider_id: number } | null>(null);
  const [savedBudget, setSavedBudget] = useState<any | null>(null);
  const [showSavedBudget, setShowSavedBudget] = useState(false);
  const [budgetBusy, setBudgetBusy] = useState(false);
  const [budgetError, setBudgetError] = useState("");
  const [from, setFrom] = useState(today()), [to, setTo] = useState(today());

  const loadRiders = useCallback(async () => setRiders((await (await fetch("/api/admin/riders")).json()).riders || []), []);
  const loadDay = useCallback(async () => {
    const [r, d, p] = await Promise.all([
      fetch(`/api/admin/report?date=${date}`).then((x) => x.json()),
      fetch(`/api/admin/deliveries?date=${date}`).then((x) => x.json()),
      fetch(`/api/admin/petty?date=${date}`).then((x) => x.json()),
    ]);
    setReport(r.riders || []); setDeliveries(d.deliveries || []); setPetty(p.petty || []);
  }, [date]);
  const summaryRange = (() => {
    if (summaryPeriod === "custom") return { from: summaryFrom, to: summaryTo };
    const [year, month, day] = date.split("-").map(Number);
    if (summaryPeriod === "daily") return { from: date, to: date };
    if (summaryPeriod === "monthly") {
      return {
        from: new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10),
        to: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
      };
    }
    const selected = new Date(Date.UTC(year, month - 1, day));
    const mondayOffset = (selected.getUTCDay() + 6) % 7;
    const monday = new Date(selected);
    monday.setUTCDate(selected.getUTCDate() - mondayOffset);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return { from: monday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) };
  })();
  useEffect(() => { loadRiders(); }, [loadRiders]);
  useEffect(() => { loadDay(); }, [loadDay]);
  useEffect(() => {
    if (tab !== "riderNotes") return;
    const controller = new AbortController();
    setRiderNotesBusy(true);
    setRiderNotesError("");
    fetch(`/api/admin/rider-notes?date=${encodeURIComponent(date)}`, { signal: controller.signal })
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Could not load rider delivery notes.");
        setRiderNotes(result.notes || []);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setRiderNotesError(error instanceof Error ? error.message : "Could not load rider delivery notes.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setRiderNotesBusy(false);
      });
    return () => controller.abort();
  }, [tab, date]);
  useEffect(() => {
    if (tab !== "paymentSummary") return;
    if (!summaryRange.from || !summaryRange.to || summaryRange.from > summaryRange.to) {
      setPaymentSummary(null);
      setSummaryBusy(false);
      setSummaryError("Choose a valid date range with the start date on or before the end date.");
      return;
    }
    const controller = new AbortController();
    setSummaryBusy(true);
    setSummaryError("");
    setPaymentSummary(null);
    const riderQuery = summaryRiderId ? `&riderId=${encodeURIComponent(summaryRiderId)}` : "";
    fetch(`/api/admin/payment-summary?from=${summaryRange.from}&to=${summaryRange.to}${riderQuery}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load the delivery payment summary.");
        setPaymentSummary(data);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setSummaryError(error instanceof Error ? error.message : "Could not load the delivery payment summary.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setSummaryBusy(false);
      });
    return () => controller.abort();
  }, [tab, summaryRange.from, summaryRange.to, summaryRiderId]);

  async function del(d: any) {
    if (!confirm(`Delete delivery for ${d.customer_name}?`)) return;
    await fetch(`/api/admin/deliveries/${d.id}`, { method: "DELETE" }); loadDay();
  }
  const saved = (r: { date: string; rider_id: number }) => {
    setEditing(null); setJustSaved(r); setSavedBudget(null); setShowSavedBudget(false); setBudgetError("");
    if (r.date !== date) setDate(r.date); else loadDay();
  };
  async function toggleSavedBudget() {
    if (showSavedBudget) {
      setShowSavedBudget(false);
      return;
    }
    if (!justSaved) return;
    setBudgetBusy(true);
    setBudgetError("");
    try {
      const res = await fetch(`/api/admin/report?date=${justSaved.date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not calculate the budget.");
      const riderReport = (data.riders || []).find((r: any) => r.rider_id === justSaved.rider_id);
      if (!riderReport) throw new Error("No budget data found for this delivery partner.");
      setSavedBudget(riderReport);
      setShowSavedBudget(true);
    } catch (error) {
      setBudgetError(error instanceof Error ? error.message : "Could not calculate the budget.");
    } finally {
      setBudgetBusy(false);
    }
  }
  const tabs: [Tab, string][] = [["assign", "Assign Delivery"], ["petty", "Petty Cash"], ["deliveries", "Deliveries"], ["riderNotes", "Rider Notes"], ["paymentSummary", "Delivery Payment Summary"], ["budget", "Daily Budget"], ["riders", "Riders"], ["profile", "Admin Profile"], ["excel", "Excel Sheet"]];
  const formatAmount = (amount: number) => Number(amount).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const summaryRangeLabel = summaryRange.from && summaryRange.to
    ? summaryRange.from === summaryRange.to
      ? prettyDate(summaryRange.from)
      : `${prettyDate(summaryRange.from)} – ${prettyDate(summaryRange.to)}`
    : "Select a date range";
  const validSummaryRange = Boolean(summaryRange.from && summaryRange.to && summaryRange.from <= summaryRange.to);
  const summaryExportUrl = `/api/admin/payment-summary/export?from=${encodeURIComponent(summaryRange.from)}&to=${encodeURIComponent(summaryRange.to)}${summaryRiderId ? `&riderId=${encodeURIComponent(summaryRiderId)}` : ""}`;
  const deliveriesByRider = [...deliveries.reduce((groups: Map<number, { riderName: string; rows: any[] }>, delivery: any) => {
    const group = groups.get(delivery.rider_id) || { riderName: delivery.rider_name, rows: [] };
    group.rows.push(delivery);
    groups.set(delivery.rider_id, group);
    return groups;
  }, new Map<number, { riderName: string; rows: any[] }>()).entries()]
    .sort((a, b) => a[1].riderName.localeCompare(b[1].riderName));

  return (
    <>
      <Header title="Admin Dashboard" />
      <div className="wrap">
        <div className="card noprint row">
          <div><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value || today())} /></div>
          <div className="muted">Showing: {prettyDate(date)}</div>
        </div>
        <div className="tabs">
          {tabs.map(([k, l]) => <button key={k} className={"tab" + (tab === k ? " active" : "")} onClick={() => { setTab(k); setEditing(null); }}>{l}</button>)}
        </div>

        {tab === "assign" && (
          <div className="card">
            {editing ? (<>
              <h2>Edit delivery #{editing.id} ({editing.payment_type})</h2>
              <DeliveryForm key={editing.id} mode={editing.payment_type} riders={riders} date={date} initial={editing} onSaved={saved} onCancel={() => setEditing(null)} />
            </>) : (<>
              <h2>Choose payment type</h2>
              <div className="row" style={{ marginBottom: 16 }}>
                <button className={"tab big" + (mode === "cash" ? " active" : "")} onClick={() => { setMode("cash"); setJustSaved(null); }}>💵 Cash Payment</button>
                <button className={"tab big" + (mode === "online" ? " active" : "")} onClick={() => { setMode("online"); setJustSaved(null); }}>📲 Online Payment</button>
              </div>
              {mode && <DeliveryForm key={mode} mode={mode} riders={riders} date={date} onSaved={saved} />}
            </>)}
          </div>
        )}
        {tab === "assign" && justSaved && justSaved.date === date && (
          <div className="card">
            <h2>✅ Delivery saved</h2>
            <button className="btn dark" onClick={toggleSavedBudget} disabled={budgetBusy} aria-expanded={showSavedBudget}>
              {budgetBusy ? "Calculating..." : showSavedBudget ? "Hide budget" : "Show budget"}
            </button>
            {budgetError && <div className="msg err">{budgetError}</div>}
            {showSavedBudget && savedBudget && (
              <div style={{ marginTop: 14 }}>
                <h3>{savedBudget.rider_name}'s budget — {prettyDate(justSaved.date)}</h3>
                <BudgetCard date={justSaved.date} rider={savedBudget.rider_name} b={savedBudget.budget} />
              </div>
            )}
          </div>
        )}

        {tab === "petty" && <PettyTab riders={riders} date={date} petty={petty} reload={loadDay} />}

        {tab === "deliveries" && (
          <div>
            <div className="card"><h2>Deliveries — {prettyDate(date)}</h2>
              {deliveries.length === 0 && <p className="muted">No deliveries for this date.</p>}
            </div>
            {deliveriesByRider.map(([riderId, group]) => (
              <div className="card" key={riderId}>
                <h2>{group.riderName} — {group.rows.length} {group.rows.length === 1 ? "delivery" : "deliveries"}</h2>
                <DeliveryTable rows={group.rows} onEdit={(d) => { setEditing(d); setTab("assign"); }} onDelete={del} />
              </div>
            ))}
          </div>
        )}

        {tab === "riderNotes" && (
          <div className="card">
            <h2>Rider delivery notes — {prettyDate(date)}</h2>
            <p className="muted">These notes are rider-submitted reminders only. They do not affect delivery records, payment summaries, or budget calculations.</p>
            {riderNotesError && <div className="msg err">{riderNotesError}</div>}
            {riderNotesBusy ? <p className="muted">Loading rider notes...</p> : riderNotes.length === 0 ? (
              <p className="muted">No rider notes for this date.</p>
            ) : (
              <div className="scroll">
                <table className="list"><thead><tr><th>Rider</th><th>Location</th><th>Fee</th><th>Payment</th><th>Additional details</th></tr></thead>
                  <tbody>{riderNotes.map((entry: any) => (
                    <tr key={entry.id}>
                      <td>{entry.rider_name}</td><td>{entry.delivery_location}</td>
                      <td>{formatAmount(entry.delivery_amount)}</td><td>{entry.payment_type}</td><td>{entry.note || "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "paymentSummary" && (
          <div className="card">
            <h2>Delivery Payment Summary</h2>
            <div className="row" style={{ marginBottom: 16 }}>
              <div><label htmlFor="summary-from">From</label><input id="summary-from" type="date" value={summaryRange.from} onChange={(e) => { setSummaryPeriod("custom"); setSummaryFrom(e.target.value); }} /></div>
              <div><label htmlFor="summary-to">To</label><input id="summary-to" type="date" value={summaryRange.to} onChange={(e) => { setSummaryPeriod("custom"); setSummaryTo(e.target.value); }} /></div>
              <div>
                <label htmlFor="summary-rider">Delivery partner</label>
                <select id="summary-rider" value={summaryRiderId} onChange={(e) => setSummaryRiderId(e.target.value)}>
                  <option value="">All delivery partners</option>
                  {riders.map((rider) => <option key={rider.id} value={rider.id}>{rider.name}</option>)}
                </select>
              </div>
              {(["daily", "weekly", "monthly"] as const).map((period) => (
                <button key={period} className={"tab" + (summaryPeriod === period ? " active" : "")} onClick={() => setSummaryPeriod(period)}>
                  {period[0].toUpperCase() + period.slice(1)}
                </button>
              ))}
              <span className="muted">{summaryRangeLabel}</span>
              {validSummaryRange
                ? <a className="btn" href={summaryExportUrl}>⬇ Export summary to Excel</a>
                : <button className="btn" disabled>⬇ Export summary to Excel</button>}
            </div>
            {summaryError && <div className="msg err">{summaryError}</div>}
            {summaryBusy ? <p className="muted">Loading summary...</p> : paymentSummary && (
              <>
                <div className="row" style={{ alignItems: "stretch" }}>
                  <div className="card"><strong>Total deliveries</strong><div>{paymentSummary.totals.deliveryCount}</div></div>
                  <div className="card"><strong>Cash delivery amount</strong><div>{formatAmount(paymentSummary.totals.cashDelivery)}</div></div>
                  <div className="card"><strong>Online delivery amount</strong><div>{formatAmount(paymentSummary.totals.onlineDelivery)}</div></div>
                  <div className="card"><strong>Total delivery amount</strong><div>{formatAmount(paymentSummary.totals.totalDelivery)}</div></div>
                  <div className="card"><strong>Rider payment ({paymentSummary.sharePercent}%)</strong><div>{formatAmount(paymentSummary.totals.riderPayment)}</div></div>
                  <div className="card"><strong>Extra cash received</strong><div>{formatAmount(paymentSummary.totals.extraCash)}</div></div>
                  <div className="card"><strong>Online products amount</strong><div>{formatAmount(paymentSummary.totals.onlineProducts)}</div></div>
                </div>
                {paymentSummary.days.length === 0 ? <p className="muted">No deliveries for this period.</p> : (
                  <div className="scroll">
                    <table className="list">
                      <thead><tr><th>Date</th><th>Deliveries</th><th>Cash Delivery</th><th>Online Delivery</th><th>Total Delivery</th><th>Rider Payment ({paymentSummary.sharePercent}%)</th><th>Extra Cash</th><th>Online Products</th></tr></thead>
                      <tbody>
                        {paymentSummary.days.map((day: any) => (
                          <tr key={day.date}>
                            <td>{prettyDate(day.date)}</td><td>{day.deliveryCount}</td>
                            <td>{formatAmount(day.cashDelivery)}</td><td>{formatAmount(day.onlineDelivery)}</td>
                            <td>{formatAmount(day.totalDelivery)}</td><td>{formatAmount(day.riderPayment)}</td><td>{formatAmount(day.extraCash)}</td>
                            <td>{formatAmount(day.onlineProducts)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "budget" && (
          <div>{report.length === 0 && <div className="card muted">No activity for this date.</div>}
            <div className="row" style={{ alignItems: "flex-start" }}>
              {report.map((r) => (
                <div className="card" key={r.rider_id}><BudgetCard date={date} rider={r.rider_name} b={r.budget} /></div>
              ))}
            </div>
          </div>
        )}

        {tab === "riders" && <RidersTab riders={riders} reload={loadRiders} />}

        {tab === "profile" && <AdminProfile />}

        {tab === "excel" && (
          <div className="card">
            <h2>Excel sheet (auto-filled from your entries)</h2>
            <p className="muted">Contains 3 sheets: Deliveries, Daily Cash Flow (one budget block per rider per day) and Summary.</p>
            <div className="row">
              <div><label>From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><label>To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
              <a className="btn" href={`/api/admin/export?from=${from}&to=${to}`}>⬇ Download Excel</a>
              <a className="btn dark" href={`/api/admin/export?from=${date}&to=${date}`}>Selected day ({date})</a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function AdminProfile() {
  const [profile, setProfile] = useState<{ name: string; username: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/profile")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load admin profile.");
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load admin profile.");
      });
    return () => { cancelled = true; };
  }, []);

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Admin Profile</h2>
      {profile && <p><strong>{profile.name}</strong> · {profile.username}</p>}
      {error && <div className="msg err">{error}</div>}
      {success && <div className="msg ok">{success}</div>}
      <form onSubmit={changePassword}>
        <h3>Change password</h3>
        <div className="grid">
          <div><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></div>
          <div><label htmlFor="new-password">New password (at least 8 characters)</label><input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
          <div><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
        </div>
        <button className="btn" style={{ marginTop: 14 }} disabled={busy}>{busy ? "Updating..." : "Update password"}</button>
      </form>
    </div>
  );
}

function PettyTab({ riders, date, petty, reload }: any) {
  const [rider, setRider] = useState(""), [amount, setAmount] = useState(""), [note, setNote] = useState("");
  const [err, setErr] = useState("");
  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const res = await fetch("/api/admin/petty", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rider_id: Number(rider), amount, note, delivery_date: date }) });
    const j = await res.json();
    if (!res.ok) return setErr(j.error);
    setAmount(""); setNote(""); reload();
  }
  async function edit(p: any) {
    const v = prompt("New petty cash amount", String(p.amount)); if (v === null) return;
    const res = await fetch(`/api/admin/petty/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: v, note: p.note }) });
    if (!res.ok) alert((await res.json()).error); reload();
  }
  async function del(p: any) {
    if (!confirm("Delete this petty cash entry?")) return;
    await fetch(`/api/admin/petty/${p.id}`, { method: "DELETE" }); reload();
  }
  return (
    <div className="card">
      <h2>Add petty cash for a rider — {prettyDate(date)}</h2>
      <form onSubmit={add}>
        <div className="grid">
          <div><label>Delivery Partner *</label><select value={rider} onChange={(e) => setRider(e.target.value)} required>
            <option value="">-- Select rider --</option>{riders.filter((r: any) => r.active).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
          <div><label>Petty Cash Amount *</label><input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
          <div><label>Note (optional)</label><input value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        {err && <div className="msg err">{err}</div>}
        <button className="btn" style={{ marginTop: 12 }}>Add Petty Cash</button>
      </form>
      <h2 style={{ marginTop: 20 }}>Entries</h2>
      {petty.length === 0 ? <p className="muted">No petty cash for this date.</p> : (
        <div className="scroll"><table className="list"><thead><tr><th>Rider</th><th>Amount</th><th>Note</th><th></th></tr></thead><tbody>
          {petty.map((p: any) => (<tr key={p.id}><td>{p.rider_name}</td><td>{Number(p.amount).toLocaleString()}</td><td>{p.note || ""}</td>
            <td><button className="btn sm" onClick={() => edit(p)}>Edit</button> <button className="btn sm red" onClick={() => del(p)}>Delete</button></td></tr>))}
        </tbody></table></div>)}
    </div>
  );
}

function RidersTab({ riders, reload }: any) {
  const [f, setF] = useState({ name: "", username: "", password: "", phone: "" });
  const [err, setErr] = useState("");
  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const res = await fetch("/api/admin/riders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await res.json();
    if (!res.ok) return setErr(j.error);
    setF({ name: "", username: "", password: "", phone: "" }); reload();
  }
  async function patch(body: any) {
    const res = await fetch("/api/admin/riders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) alert((await res.json()).error); reload();
  }
  return (
    <div className="card">
      <h2>Add delivery partner (rider login)</h2>
      <form onSubmit={add}>
        <div className="grid">
          <div><label>Name *</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
          <div><label>Username *</label><input value={f.username} autoCapitalize="none" onChange={(e) => setF({ ...f, username: e.target.value })} required /></div>
          <div><label>Password * (min 6)</label><input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></div>
          <div><label>Phone</label><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        </div>
        {err && <div className="msg err">{err}</div>}
        <button className="btn" style={{ marginTop: 12 }}>Add Rider</button>
      </form>
      <h2 style={{ marginTop: 20 }}>Riders</h2>
      <div className="scroll"><table className="list"><thead><tr><th>Name</th><th>Username</th><th>Phone</th><th>Status</th><th></th></tr></thead><tbody>
        {riders.map((r: any) => (<tr key={r.id}><td>{r.name}</td><td>{r.username}</td><td>{r.phone || ""}</td><td>{r.active ? "Active" : "Disabled"}</td>
          <td><button className="btn sm" onClick={() => patch({ id: r.id, active: !r.active })}>{r.active ? "Disable" : "Enable"}</button>{" "}
            <button className="btn sm dark" onClick={() => { const p = prompt("New password (min 6)"); if (p) patch({ id: r.id, password: p }); }}>Reset password</button></td></tr>))}
      </tbody></table></div>
    </div>
  );
}

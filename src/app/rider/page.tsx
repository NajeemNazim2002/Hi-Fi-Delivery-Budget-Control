"use client";
import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import BudgetCard from "@/components/BudgetCard";
import DeliveryTable from "@/components/DeliveryTable";
import { today, prettyDate } from "@/lib/date";

export default function Rider() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState<any>(null);
  const [loadError, setLoadError] = useState("");
  const [notes, setNotes] = useState<any[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteForm, setNoteForm] = useState({ delivery_location: "", delivery_amount: "", payment_type: "cash", note: "" });
  const [noteError, setNoteError] = useState("");
  const [noteSuccess, setNoteSuccess] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [reportRes, notesRes] = await Promise.all([
        fetch(`/api/rider/report?date=${date}`),
        fetch(`/api/rider/notes?date=${date}`),
      ]);
      if (reportRes.status === 401 || notesRes.status === 401) { window.location.href = "/login"; return; }
      const [report, noteData] = await Promise.all([reportRes.json(), notesRes.json()]);
      if (!reportRes.ok) throw new Error(report.error || "Could not load your delivery report.");
      if (!notesRes.ok) throw new Error(noteData.error || "Could not load your delivery notes.");
      setData(report);
      setNotes(noteData.notes || []);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load your dashboard.");
    }
  }, [date]);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  async function submitNote(event: React.FormEvent) {
    event.preventDefault();
    setNoteError("");
    setNoteSuccess("");
    setNoteBusy(true);
    try {
      const res = await fetch(editingNoteId ? `/api/rider/notes/${editingNoteId}` : "/api/rider/notes", {
        method: editingNoteId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...noteForm, delivery_date: date }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || (editingNoteId ? "Could not update delivery note." : "Could not save delivery note."));
      const wasEditing = editingNoteId !== null;
      setEditingNoteId(null);
      setNoteForm({ delivery_location: "", delivery_amount: "", payment_type: "cash", note: "" });
      setNoteSuccess(wasEditing ? "Delivery note updated." : "Delivery note saved for the admin. It does not change your delivery or budget calculations.");
      await load();
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "Could not save delivery note.");
    } finally {
      setNoteBusy(false);
    }
  }

  function editNote(entry: any) {
    setEditingNoteId(entry.id);
    setNoteForm({
      delivery_location: entry.delivery_location,
      delivery_amount: String(entry.delivery_amount),
      payment_type: entry.payment_type,
      note: entry.note || "",
    });
    setNoteError("");
    setNoteSuccess("");
  }

  function cancelEdit() {
    setEditingNoteId(null);
    setNoteForm({ delivery_location: "", delivery_amount: "", payment_type: "cash", note: "" });
    setNoteError("");
    setNoteSuccess("");
  }

  async function deleteNote(entry: any) {
    if (!confirm(`Delete the delivery note for ${entry.delivery_location}?`)) return;
    setNoteError("");
    setNoteSuccess("");
    try {
      const res = await fetch(`/api/rider/notes/${entry.id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Could not delete delivery note.");
      if (editingNoteId === entry.id) cancelEdit();
      setNoteSuccess("Delivery note deleted.");
      await load();
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "Could not delete delivery note.");
    }
  }

  return (
    <>
      <Header title="Delivery Partner Dashboard" />
      <div className="wrap">
        <div className="card noprint row">
          <div><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value || today())} /></div>
          <button className="btn dark" onClick={load}>↻ Refresh</button>
          <span className="muted">Updates automatically every 30 seconds</span>
        </div>
        {!data ? <div className="card">{loadError ? <div className="msg err">{loadError}</div> : <p className="muted">Loading...</p>}</div> : (<>
          <div className="card"><h2>My budget — {prettyDate(date)}</h2><BudgetCard date={date} rider={data.name} b={data.budget} /></div>
          <div className="card"><h2>My deliveries</h2><DeliveryTable rows={data.deliveries} /></div>
          <div className="card">
            <h2>Delivery notes for admin — {prettyDate(date)}</h2>
            <p className="muted">Use this if a delivery is missing or its details need updating. Notes are separate and do not change delivery or budget calculations.</p>
            <form onSubmit={submitNote}>
              <div className="grid">
                <div><label htmlFor="note-location">Delivery location *</label><input id="note-location" maxLength={300} value={noteForm.delivery_location} onChange={(e) => setNoteForm({ ...noteForm, delivery_location: e.target.value })} required /></div>
                <div><label htmlFor="note-fee">Delivery fee *</label><input id="note-fee" type="number" min="0" max="9999999999.99" step="0.01" value={noteForm.delivery_amount} onChange={(e) => setNoteForm({ ...noteForm, delivery_amount: e.target.value })} required /></div>
                <div><label htmlFor="note-payment">Payment type *</label><select id="note-payment" value={noteForm.payment_type} onChange={(e) => setNoteForm({ ...noteForm, payment_type: e.target.value })}><option value="cash">Cash</option><option value="online">Online</option></select></div>
                <div><label htmlFor="note-details">Additional details (optional)</label><input id="note-details" maxLength={1000} value={noteForm.note} onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })} /></div>
              </div>
              {noteError && <div className="msg err">{noteError}</div>}
              {noteSuccess && <div className="msg ok">{noteSuccess}</div>}
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn" disabled={noteBusy}>{noteBusy ? "Saving..." : editingNoteId ? "Update delivery note" : "Add delivery note"}</button>
                {editingNoteId !== null && <button type="button" className="btn dark" disabled={noteBusy} onClick={cancelEdit}>Cancel edit</button>}
              </div>
            </form>
            <h3 style={{ marginTop: 20 }}>My notes for this date</h3>
            {notes.length === 0 ? <p className="muted">No delivery notes for this date.</p> : (
              <div className="scroll">
                <table className="list"><thead><tr><th>Location</th><th>Fee</th><th>Payment</th><th>Details</th><th>Actions</th></tr></thead>
                  <tbody>{notes.map((entry: any) => (
                    <tr key={entry.id}><td>{entry.delivery_location}</td><td>{Number(entry.delivery_amount).toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
                      <td>{entry.payment_type}</td><td>{entry.note || "—"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button type="button" className="btn sm" onClick={() => editNote(entry)}>Edit</button>{" "}
                        <button type="button" className="btn sm red" onClick={() => deleteNote(entry)}>Delete</button>
                      </td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
          {data.petty.length > 0 && (
            <div className="card"><h2>Petty cash given</h2>
              {data.petty.map((p: any) => <div key={p.id}>{Number(p.amount).toLocaleString()} {p.note ? `— ${p.note}` : ""}</div>)}</div>)}
        </>)}
      </div>
    </>
  );
}

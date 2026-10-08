"use client";
import { prettyDate } from "@/lib/date";

const f = (n: number) => Math.round(n).toLocaleString("en-US");
const f2 = (n: number) => (Number.isInteger(n) ? f(n) : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export default function BudgetCard({ date, rider, b }: { date: string; rider: string; b: any }) {
  const L = ({ k, v, g }: { k: string; v: number; g?: boolean }) => (
    <div className={"l" + (g ? " g" : "")}><span>{k}</span><span>{f2(v)}</span></div>
  );
  return (
    <div>
      <div className="sheet">
        <div className="t">Hi-fi Delivery Rider Daily Cash Flow</div>
        <div style={{ height: 8 }} />
        <div className="meta"><span>Date</span><span>{prettyDate(date)}</span></div>
        <div className="meta"><span>Rider Name</span><span>{rider}</span></div>
        <div className="s">Cash Collection Summary</div>
        <L k="Petty Cash" v={b.pettyCash} />
        <L k="Extra Cash Received" v={b.extraCash} />
        <L k="Received Delivery Amount" v={b.receivedDelivery} />
        <L k="Total Collection" v={b.totalCollection} g />
        <L k="Online Transfer" v={b.onlineTransfer} />
        <L k="Total Cash" v={b.totalCash} g />
        <div className="s">Delivery Payment Summary</div>
        <L k="Online Delivery Amount" v={b.onlineDelivery} />
        <L k="Cash Delivery Amount" v={b.cashDelivery} />
        <L k="Total Delivery Amount" v={b.totalDelivery} g />
        <L k={`Rider Payment (${b.sharePercent}%)`} v={b.riderPayment} g />
        <L k="Cash in Hand Balance" v={b.cashInHand} g />
      </div>
      <button className="btn dark sm noprint" style={{ marginTop: 8 }} onClick={() => window.print()}>🖨 Print budget</button>
    </div>
  );
}

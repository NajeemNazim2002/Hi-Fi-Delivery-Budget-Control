import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/auth";
import { isValidDate, today, prettyDate } from "@/lib/date";
import { deliveriesBetween, pettyBetween } from "@/lib/report";
import { computeBudget, RIDER_SHARE } from "@/lib/budget";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NAVY = "FF305496", BLUE = "FF5B9BD5", GREEN = "FFC6E0B4", YELLOW = "FFFBBF0F";
const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const thin: Partial<ExcelJS.Borders> = {
  top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" },
};

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const from = sp.get("from") || today(), to = sp.get("to") || from;
  if (!isValidDate(from) || !isValidDate(to) || from > to)
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });

  const [dels, pets] = await Promise.all([deliveriesBetween(from, to), pettyBetween(from, to)]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Hi-Fi Delivery Service";

  // ---------- Sheet 1: Deliveries ----------
  const ws = wb.addWorksheet("Deliveries", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Date", key: "date", width: 13 }, { header: "Rider", key: "rider", width: 16 },
    { header: "Payment", key: "pt", width: 10 }, { header: "Customer", key: "cn", width: 20 },
    { header: "Phone", key: "ph", width: 15 }, { header: "Pickup", key: "pu", width: 22 },
    { header: "Delivery Location", key: "dl", width: 22 }, { header: "Delivery Amount", key: "da", width: 16 },
    { header: "Extra Amount", key: "ea", width: 14 }, { header: "Online Products Amount", key: "pa", width: 22 },
  ];
  ws.getRow(1).eachCell((c) => { c.fill = fill(NAVY); c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.border = thin; });
  dels.forEach((d) => {
    const r = ws.addRow({ date: d.delivery_date, rider: d.rider_name, pt: d.payment_type === "cash" ? "Cash" : "Online",
      cn: d.customer_name, ph: d.customer_phone, pu: d.pickup_location, dl: d.delivery_location,
      da: d.delivery_amount, ea: d.extra_amount, pa: d.products_amount });
    r.eachCell((c) => (c.border = thin));
  });
  const n = dels.length;
  const tr = ws.addRow({ cn: "TOTAL", da: { formula: `SUM(H2:H${n + 1})` }, ea: { formula: `SUM(I2:I${n + 1})` }, pa: { formula: `SUM(J2:J${n + 1})` } });
  tr.eachCell({ includeEmpty: true }, (c) => { c.font = { bold: true }; c.fill = fill(GREEN); c.border = thin; });
  ["H", "I", "J"].forEach((c) => (ws.getColumn(c).numFmt = "#,##0.00"));

  // ---------- Sheet 2: Daily Cash Flow (one block per rider per day) ----------
  const cf = wb.addWorksheet("Daily Cash Flow");
  cf.getColumn(1).width = 34; cf.getColumn(2).width = 16;
  const groups = new Map<string, { date: string; rider: string; d: any[]; p: any[] }>();
  const g = (date: string, id: number, name: string) => {
    const k = `${date}|${name}|${id}`;
    if (!groups.has(k)) groups.set(k, { date, rider: name, d: [], p: [] });
    return groups.get(k)!;
  };
  dels.forEach((d) => g(d.delivery_date, d.rider_id, d.rider_name).d.push(d));
  pets.forEach((p) => g(p.delivery_date, p.rider_id, p.rider_name).p.push(p));
  const sorted = [...groups.values()].sort((a, b) => a.date.localeCompare(b.date) || a.rider.localeCompare(b.rider));

  const summary: any[] = [];
  let row = 1;
  for (const grp of sorted) {
    const b = computeBudget(grp.d, grp.p);
    summary.push({ date: grp.date, rider: grp.rider, b });
    const title = cf.getRow(row);
    cf.mergeCells(row, 1, row, 2);
    title.getCell(1).value = "Hi-fi Delivery Rider Daily Cash Flow";
    title.getCell(1).font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    title.getCell(1).fill = fill(NAVY);
    cf.getCell(row + 2, 1).value = "Date"; cf.getCell(row + 2, 2).value = prettyDate(grp.date);
    cf.getCell(row + 3, 1).value = "Rider Name"; cf.getCell(row + 3, 2).value = grp.rider;
    cf.getCell(row + 2, 2).alignment = { horizontal: "right" }; cf.getCell(row + 3, 2).alignment = { horizontal: "right" };
    const sec = (r: number, text: string) => {
      cf.mergeCells(r, 1, r, 2); const c = cf.getCell(r, 1);
      c.value = text; c.fill = fill(BLUE); c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    };
    const line = (r: number, label: string, val: number | { formula: string; result: number }, bold = false, green = false) => {
      const a = cf.getCell(r, 1), v = cf.getCell(r, 2);
      a.value = label; v.value = val as any; v.numFmt = "#,##0"; v.alignment = { horizontal: "right" };
      a.border = thin; v.border = thin;
      if (bold) a.font = { bold: true }, v.font = { bold: true };
      if (green) v.fill = fill(GREEN);
    };
    const s = row + 5; // Cash Collection Summary
    sec(s, "Cash Collection Summary");
    line(s + 1, "Petty Cash", b.pettyCash);
    line(s + 2, "Extra Cash Received", b.extraCash);
    line(s + 3, "Received Delivery Amount", b.receivedDelivery);
    line(s + 4, "Total Collection", { formula: `SUM(B${s + 1}:B${s + 3})`, result: b.totalCollection }, true, true);
    line(s + 5, "Online Transfer", b.onlineTransfer);
    line(s + 6, "Total Cash", { formula: `B${s + 4}-B${s + 5}`, result: b.totalCash }, true, true);
    const t = s + 8; // Delivery Payment Summary
    sec(t, "Delivery Payment Summary");
    line(t + 1, "Online Delivery Amount", b.onlineDelivery);
    line(t + 2, "Cash Delivery Amount", b.cashDelivery);
    line(t + 3, "Total Delivery Amount", { formula: `B${t + 1}+B${t + 2}`, result: b.totalDelivery }, true, true);
    line(t + 4, `Rider Payment (${RIDER_SHARE}%)`, { formula: `ROUND(B${t + 3}*${RIDER_SHARE}/100,2)`, result: b.riderPayment }, true, true);
    line(t + 5, "Cash in Hand Balance", { formula: `B${s + 6}-B${t + 4}`, result: b.cashInHand }, true, true);
    row = t + 8;
  }
  if (!sorted.length) cf.getCell(1, 1).value = "No data for the selected dates";

  // ---------- Sheet 3: Summary ----------
  const sm = wb.addWorksheet("Summary", { views: [{ state: "frozen", ySplit: 1 }] });
  sm.columns = ["Date", "Rider", "Petty Cash", "Total Collection", "Online Transfer", "Total Cash",
    "Total Delivery", `Rider Payment (${RIDER_SHARE}%)`, "Cash in Hand Balance"].map((h, i) => ({ header: h, width: i < 2 ? 15 : 20 }));
  sm.getRow(1).eachCell((c) => { c.fill = fill(YELLOW); c.font = { bold: true }; c.border = thin; });
  summary.forEach(({ date, rider, b }) => {
    sm.addRow([date, rider, b.pettyCash, b.totalCollection, b.onlineTransfer, b.totalCash, b.totalDelivery, b.riderPayment, b.cashInHand])
      .eachCell((c) => (c.border = thin));
  });
  for (let c = 3; c <= 9; c++) sm.getColumn(c).numFmt = "#,##0.00";

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="HiFi-Delivery-${from}${to !== from ? "_to_" + to : ""}.xlsx"`,
    },
  });
}

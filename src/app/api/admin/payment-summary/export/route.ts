import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { q } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isValidDate, today, prettyDate } from "@/lib/date";
import { deliveriesBetween } from "@/lib/report";
import { summarizeDeliveryPayments } from "@/lib/payment-summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const from = params.get("from") || today();
  const to = params.get("to") || from;
  const riderParam = params.get("riderId");
  const riderId = riderParam === null || riderParam === "" ? undefined : Number(riderParam);

  if (!isValidDate(from) || !isValidDate(to) || from > to)
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  if (riderId !== undefined && (!Number.isInteger(riderId) || riderId < 1))
    return NextResponse.json({ error: "Invalid delivery partner" }, { status: 400 });

  let riderName = "All delivery partners";
  if (riderId !== undefined) {
    const riders = await q("SELECT name FROM users WHERE id=$1 AND role='rider'", [riderId]);
    if (!riders[0]) return NextResponse.json({ error: "Delivery partner not found" }, { status: 404 });
    riderName = riders[0].name;
  }

  const deliveries = await deliveriesBetween(from, to, riderId);
  const summary = summarizeDeliveryPayments(deliveries);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hi-Fi Delivery Service";

  const sheet = workbook.addWorksheet("Delivery Payment Summary", {
    views: [{ state: "frozen", ySplit: 5 }],
  });
  const headers = [
    "Date",
    "Deliveries",
    "Cash Delivery",
    "Online Delivery",
    "Total Delivery",
    `Rider Payment (${summary.sharePercent}%)`,
    "Extra Cash",
    "Online Products",
  ];
  sheet.columns = [
    { header: headers[0], key: "date", width: 18 },
    { header: headers[1], key: "deliveryCount", width: 14 },
    { header: headers[2], key: "cashDelivery", width: 18 },
    { header: headers[3], key: "onlineDelivery", width: 18 },
    { header: headers[4], key: "totalDelivery", width: 18 },
    { header: headers[5], key: "riderPayment", width: 23 },
    { header: headers[6], key: "extraCash", width: 16 },
    { header: headers[7], key: "onlineProducts", width: 20 },
  ];
  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = "Delivery Payment Summary";
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF305496" } };
  sheet.mergeCells("A2:H2");
  sheet.getCell("A2").value = `Delivery partner: ${riderName}`;
  sheet.mergeCells("A3:H3");
  sheet.getCell("A3").value = `Period: ${prettyDate(from)}${from === to ? "" : ` - ${prettyDate(to)}`}`;

  const header = sheet.getRow(5);
  header.values = headers;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5B9BD5" } };
  });

  for (const day of summary.days) {
    sheet.addRow({ ...day, date: prettyDate(day.date) });
  }

  if (summary.days.length > 0) {
    const totalRow = sheet.addRow({
      date: "TOTAL",
      deliveryCount: summary.totals.deliveryCount,
      cashDelivery: summary.totals.cashDelivery,
      onlineDelivery: summary.totals.onlineDelivery,
      totalDelivery: summary.totals.totalDelivery,
      riderPayment: summary.totals.riderPayment,
      extraCash: summary.totals.extraCash,
      onlineProducts: summary.totals.onlineProducts,
    });
    totalRow.font = { bold: true };
    totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6E0B4" } };
  } else {
    sheet.addRow({ date: "No deliveries for this period." });
  }

  for (const column of [3, 4, 5, 6, 7, 8]) sheet.getColumn(column).numFmt = "#,##0.00";

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Delivery-Payment-Summary-${riderId ?? "all"}-${from}${to !== from ? `-to-${to}` : ""}.xlsx`;
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

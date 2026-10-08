import { RIDER_SHARE } from "./budget";

export type DeliveryPaymentTotals = {
  deliveryCount: number;
  cashDelivery: number;
  onlineDelivery: number;
  totalDelivery: number;
  riderPayment: number;
  extraCash: number;
  onlineProducts: number;
};

const emptyTotals = (): DeliveryPaymentTotals => ({
  deliveryCount: 0,
  cashDelivery: 0,
  onlineDelivery: 0,
  totalDelivery: 0,
  riderPayment: 0,
  extraCash: 0,
  onlineProducts: 0,
});

const round = (value: number) => Math.round(value * 100) / 100;

function roundTotals(value: DeliveryPaymentTotals): DeliveryPaymentTotals {
  const totalDelivery = round(value.totalDelivery);
  return {
    ...value,
    cashDelivery: round(value.cashDelivery),
    onlineDelivery: round(value.onlineDelivery),
    totalDelivery,
    riderPayment: round((totalDelivery * RIDER_SHARE) / 100),
    extraCash: round(value.extraCash),
    onlineProducts: round(value.onlineProducts),
  };
}

export function summarizeDeliveryPayments(deliveries: any[]) {
  const totals = emptyTotals();
  const byDate = new Map<string, DeliveryPaymentTotals>();

  for (const delivery of deliveries) {
    const amount = Number(delivery.delivery_amount);
    const day = byDate.get(delivery.delivery_date) || emptyTotals();
    day.deliveryCount += 1;
    totals.deliveryCount += 1;

    if (delivery.payment_type === "cash") {
      day.cashDelivery += amount;
      day.extraCash += Number(delivery.extra_amount);
      totals.cashDelivery += amount;
      totals.extraCash += Number(delivery.extra_amount);
    } else {
      day.onlineDelivery += amount;
      day.onlineProducts += Number(delivery.products_amount);
      totals.onlineDelivery += amount;
      totals.onlineProducts += Number(delivery.products_amount);
    }

    day.totalDelivery += amount;
    totals.totalDelivery += amount;
    byDate.set(delivery.delivery_date, day);
  }

  return {
    sharePercent: RIDER_SHARE,
    totals: roundTotals(totals),
    days: [...byDate.entries()].map(([date, day]) => ({ date, ...roundTotals(day) })),
  };
}

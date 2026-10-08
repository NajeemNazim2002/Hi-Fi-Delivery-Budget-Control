export const RIDER_SHARE = Number(process.env.RIDER_SHARE_PERCENT || 70);

export type Budget = {
  pettyCash: number; extraCash: number; receivedDelivery: number; totalCollection: number;
  onlineTransfer: number; totalCash: number;
  onlineDelivery: number; cashDelivery: number; totalDelivery: number;
  riderPayment: number; cashInHand: number; sharePercent: number;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeBudget(deliveries: any[], petty: any[]): Budget {
  const pettyCash = petty.reduce((s, p) => s + Number(p.amount), 0);
  const cash = deliveries.filter((d) => d.payment_type === "cash");
  const online = deliveries.filter((d) => d.payment_type === "online");
  const extraCash = cash.reduce((s, d) => s + Number(d.extra_amount), 0);
  const receivedDelivery = cash.reduce((s, d) => s + Number(d.delivery_amount), 0);
  const totalCollection = pettyCash + extraCash + receivedDelivery;
  const onlineTransfer = online.reduce((s, d) => s + Number(d.products_amount), 0);
  const totalCash = totalCollection - onlineTransfer;
  const onlineDelivery = online.reduce((s, d) => s + Number(d.delivery_amount), 0);
  const totalDelivery = onlineDelivery + receivedDelivery;
  const riderPayment = r2((totalDelivery * RIDER_SHARE) / 100);
  return {
    pettyCash: r2(pettyCash), extraCash: r2(extraCash), receivedDelivery: r2(receivedDelivery),
    totalCollection: r2(totalCollection), onlineTransfer: r2(onlineTransfer), totalCash: r2(totalCash),
    onlineDelivery: r2(onlineDelivery), cashDelivery: r2(receivedDelivery), totalDelivery: r2(totalDelivery),
    riderPayment, cashInHand: r2(totalCash - riderPayment), sharePercent: RIDER_SHARE,
  };
}

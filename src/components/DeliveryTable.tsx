"use client";
const m = (n: number) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function DeliveryTable({ rows, showRider, onEdit, onDelete }: {
  rows: any[]; showRider?: boolean; onEdit?: (d: any) => void; onDelete?: (d: any) => void;
}) {
  if (!rows.length) return <p className="muted">No deliveries for this date.</p>;
  return (
    <div className="scroll">
      <table className="list">
        <thead><tr>
          <th>#</th>{showRider && <th>Rider</th>}<th>Type</th><th>Customer</th><th>Phone</th><th>Pickup</th><th>Delivery</th>
          <th>Delivery Amt</th><th>Extra</th><th>Products (online)</th>{(onEdit || onDelete) && <th></th>}
        </tr></thead>
        <tbody>
          {rows.map((d, i) => (
            <tr key={d.id}>
              <td>{i + 1}</td>{showRider && <td>{d.rider_name}</td>}
              <td><span className={"pill " + d.payment_type}>{d.payment_type}</span></td>
              <td>{d.customer_name}</td><td>{d.customer_phone}</td><td>{d.pickup_location}</td><td>{d.delivery_location}</td>
              <td>{m(d.delivery_amount)}</td>
              <td>{d.payment_type === "cash" ? m(d.extra_amount) : "-"}</td>
              <td>{d.payment_type === "online" ? m(d.products_amount) : "-"}</td>
              {(onEdit || onDelete) && (
                <td style={{ whiteSpace: "nowrap" }}>
                  {onEdit && <button className="btn sm" onClick={() => onEdit(d)}>Edit</button>}{" "}
                  {onDelete && <button className="btn sm red" onClick={() => onDelete(d)}>Delete</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

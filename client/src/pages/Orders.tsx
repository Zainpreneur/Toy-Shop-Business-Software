import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Order, OrderStatus } from "../api/types";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import { formatDateTime, formatMoney } from "../lib/format";
import { useAuth } from "../context/AuthContext";

const statusTone: Record<OrderStatus, "success" | "warning" | "danger" | "default"> = {
  PAID: "success",
  PENDING: "warning",
  REFUNDED: "danger",
  CANCELLED: "default",
};

export default function Orders() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<Order[]>(`/orders${statusFilter ? `?status=${statusFilter}` : ""}`);
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const totals = useMemo(() => {
    const paid = orders.filter((o) => o.status === "PAID");
    return { count: paid.length, revenue: paid.reduce((s, o) => s + o.total, 0) };
  }, [orders]);

  async function updateStatus(order: Order, status: OrderStatus) {
    if (status === "REFUNDED" && !confirm(`Refund order ${order.orderNumber}? Stock will be restored.`)) return;
    try {
      await api.patch(`/orders/${order.id}/status`, { status });
      await load();
      setSelected(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update order");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p className="page-subtitle">
            {totals.count} paid orders shown · {formatMoney(totals.revenue)} total
          </p>
        </div>
      </div>

      <div className="toolbar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="REFUNDED">Refunded</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="page-loading">Loading orders&hellip;</div>
      ) : (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.orderNumber}</td>
                  <td>{o.customer?.name ?? "Walk-in"}</td>
                  <td>{o.items.length}</td>
                  <td>{formatMoney(o.total)}</td>
                  <td>
                    <Badge tone={statusTone[o.status]}>{o.status}</Badge>
                  </td>
                  <td>{formatDateTime(o.createdAt)}</td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelected(o)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-hint">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal title={`Order ${selected.orderNumber}`} onClose={() => setSelected(null)} width={520}>
          <div className="order-detail-meta">
            <div>
              <strong>Customer:</strong> {selected.customer?.name ?? "Walk-in"}
            </div>
            <div>
              <strong>Cashier:</strong> {selected.user?.name ?? "—"}
            </div>
            <div>
              <strong>Payment:</strong> {selected.paymentMethod}
            </div>
            <div>
              <strong>Status:</strong> <Badge tone={statusTone[selected.status]}>{selected.status}</Badge>
            </div>
            <div>
              <strong>Date:</strong> {formatDateTime(selected.createdAt)}
            </div>
          </div>
          <ul className="simple-list">
            {selected.items.map((it) => (
              <li key={it.id} className="simple-list-item">
                <div className="simple-list-main">
                  <div className="simple-list-title">{it.product.name}</div>
                  <div className="simple-list-sub">
                    {it.quantity} × {formatMoney(it.unitPrice)}
                  </div>
                </div>
                <div className="simple-list-value">{formatMoney(it.lineTotal)}</div>
              </li>
            ))}
          </ul>
          <div className="receipt">
            <div className="receipt-row">
              <span>Subtotal</span>
              <span>{formatMoney(selected.subtotal)}</span>
            </div>
            <div className="receipt-row">
              <span>Discount</span>
              <span>-{formatMoney(selected.discount)}</span>
            </div>
            <div className="receipt-row">
              <span>Tax</span>
              <span>{formatMoney(selected.tax)}</span>
            </div>
            <div className="receipt-row receipt-total">
              <span>Total</span>
              <span>{formatMoney(selected.total)}</span>
            </div>
          </div>
          {canManage && selected.status === "PAID" && (
            <div className="form-actions">
              <button className="btn btn-danger" onClick={() => updateStatus(selected, "REFUNDED")}>
                Mark Refunded
              </button>
              <button className="btn btn-secondary" onClick={() => updateStatus(selected, "CANCELLED")}>
                Cancel Order
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

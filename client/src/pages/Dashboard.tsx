import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import type { DashboardSummary, Product, SalesTrendPoint, TopProduct } from "../api/types";
import StatCard from "../components/StatCard";
import Badge from "../components/Badge";
import { formatMoney } from "../lib/format";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<SalesTrendPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardSummary>("/dashboard/summary"),
      api.get<SalesTrendPoint[]>("/dashboard/sales-trend?days=14"),
      api.get<TopProduct[]>("/dashboard/top-products?limit=5"),
      api.get<Product[]>("/dashboard/low-stock"),
    ])
      .then(([s, t, tp, ls]) => {
        setSummary(s);
        setTrend(t);
        setTopProducts(tp);
        setLowStock(ls);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !summary) return <div className="page-loading">Loading dashboard&hellip;</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="page-subtitle">Here&rsquo;s how the shop is doing today.</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Today's Revenue" value={formatMoney(summary.todaysRevenue)} hint={`${summary.todaysOrderCount} orders today`} icon="💰" tone="success" />
        <StatCard label="Total Revenue" value={formatMoney(summary.totalRevenue)} hint={`${summary.totalOrders} paid orders`} icon="📈" />
        <StatCard label="Products" value={String(summary.productCount)} hint="active in catalog" icon="🧸" />
        <StatCard label="Low Stock Alerts" value={String(summary.lowStockCount)} hint="need reordering" icon="⚠️" tone={summary.lowStockCount > 0 ? "warning" : "default"} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Sales Trend (14 days)</h3>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value: number) => [formatMoney(value), "Revenue"]}
                  labelFormatter={(label) => label}
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Top Selling Toys</h3>
          </div>
          <ul className="simple-list">
            {topProducts.length === 0 && <li className="empty-hint">No sales yet.</li>}
            {topProducts.map((tp, i) => (
              <li key={tp.product?.id ?? i} className="simple-list-item">
                <span className="rank-badge">{i + 1}</span>
                <div className="simple-list-main">
                  <div className="simple-list-title">{tp.product?.name ?? "Unknown product"}</div>
                  <div className="simple-list-sub">{tp.totalSold} sold</div>
                </div>
                <div className="simple-list-value">{formatMoney(tp.totalRevenue)}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Low Stock &amp; Reorder Alerts</h3>
        </div>
        {lowStock.length === 0 ? (
          <div className="empty-hint">Everything is well stocked 🎉</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Supplier</th>
                  <th>Stock</th>
                  <th>Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="mono">{p.sku}</td>
                    <td>{p.category?.name ?? "—"}</td>
                    <td>{p.supplier?.name ?? "—"}</td>
                    <td>
                      <Badge tone={p.stockQty === 0 ? "danger" : "warning"}>{p.stockQty} left</Badge>
                    </td>
                    <td>{p.reorderLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Customer } from "../api/types";
import Modal from "../components/Modal";
import Badge from "../components/Badge";
import { formatDate, formatMoney } from "../lib/format";
import { useAuth } from "../context/AuthContext";

const emptyForm = { name: "", email: "", phone: "", address: "", notes: "" };

export default function Customers() {
  const { user } = useAuth();
  const canDelete = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Customer | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<Customer[]>(`/customers${search ? `?q=${encodeURIComponent(search)}` : ""}`);
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, email: c.email ?? "", phone: c.phone ?? "", address: c.address ?? "", notes: c.notes ?? "" });
    setError(null);
    setShowForm(true);
  }

  async function openDetail(c: Customer) {
    const full = await api.get<Customer>(`/customers/${c.id}`);
    setDetail(full);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editing) await api.put(`/customers/${editing.id}`, payload);
      else await api.post("/customers", payload);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save customer");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    await api.delete(`/customers/${c.id}`);
    await load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p className="page-subtitle">{customers.length} customers on file</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Customer
        </button>
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Search by name, email, or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="page-loading">Loading customers&hellip;</div>
      ) : (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Orders</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <button className="link-button" onClick={() => openDetail(c)}>
                      {c.name}
                    </button>
                  </td>
                  <td>
                    <div className="cell-sub">{c.email || "—"}</div>
                    <div className="cell-sub">{c.phone || ""}</div>
                  </td>
                  <td>
                    <Badge tone="info">{c._count?.orders ?? 0} orders</Badge>
                  </td>
                  <td>{formatDate(c.createdAt)}</td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>
                      Edit
                    </button>
                    {canDelete && (
                      <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(c)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-hint">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Edit Customer" : "Add Customer"} onClose={() => setShowForm(false)} width={480}>
          <form onSubmit={handleSubmit} className="form-grid">
            {error && <div className="alert alert-error span-2">{error}</div>}
            <label className="field span-2">
              <span>Full Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="field">
              <span>Phone</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="field span-2">
              <span>Address</span>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
            <label className="field span-2">
              <span>Notes</span>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
            <div className="form-actions span-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Customer"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title={`${detail.name} — Purchase History`} onClose={() => setDetail(null)} width={640}>
          <div className="customer-detail-meta">
            {detail.email && <div>✉️ {detail.email}</div>}
            {detail.phone && <div>📞 {detail.phone}</div>}
            {detail.address && <div>📍 {detail.address}</div>}
            {detail.notes && <div>📝 {detail.notes}</div>}
          </div>
          <ul className="simple-list">
            {(detail.orders ?? []).length === 0 && <li className="empty-hint">No orders yet.</li>}
            {(detail.orders ?? []).map((o) => (
              <li key={o.id} className="simple-list-item">
                <div className="simple-list-main">
                  <div className="simple-list-title">{o.orderNumber}</div>
                  <div className="simple-list-sub">
                    {formatDate(o.createdAt)} · {o.items.length} item(s)
                  </div>
                </div>
                <div className="simple-list-value">
                  {formatMoney(o.total)}
                  <div>
                    <Badge tone={o.status === "PAID" ? "success" : o.status === "REFUNDED" ? "danger" : "default"}>{o.status}</Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  );
}

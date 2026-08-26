import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Supplier } from "../api/types";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const emptyForm = { name: "", contactName: "", email: "", phone: "", address: "" };

export default function Suppliers() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<Supplier[]>(`/suppliers${search ? `?q=${encodeURIComponent(search)}` : ""}`);
      setSuppliers(data);
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

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({ name: s.name, contactName: s.contactName ?? "", email: s.email ?? "", phone: s.phone ?? "", address: s.address ?? "" });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        contactName: form.contactName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      };
      if (editing) await api.put(`/suppliers/${editing.id}`, payload);
      else await api.post("/suppliers", payload);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: Supplier) {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    try {
      await api.delete(`/suppliers/${s.id}`);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete supplier");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Suppliers</h1>
          <p className="page-subtitle">{suppliers.length} suppliers</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Supplier
          </button>
        )}
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Search suppliers…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="page-loading">Loading suppliers&hellip;</div>
      ) : (
        <div className="card-grid">
          {suppliers.map((s) => (
            <div className="card supplier-card" key={s.id}>
              <div className="card-header">
                <h3>{s.name}</h3>
                <span className="pill">{s._count?.products ?? 0} products</span>
              </div>
              <div className="supplier-meta">
                {s.contactName && <div>👤 {s.contactName}</div>}
                {s.email && <div>✉️ {s.email}</div>}
                {s.phone && <div>📞 {s.phone}</div>}
                {s.address && <div>📍 {s.address}</div>}
                {!s.contactName && !s.email && !s.phone && !s.address && <div className="empty-hint">No contact details yet.</div>}
              </div>
              <div className="row-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                  {expanded === s.id ? "Hide products" : "View products"}
                </button>
                {canManage && (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(s)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
              {expanded === s.id && <SupplierProducts supplierId={s.id} />}
            </div>
          ))}
          {suppliers.length === 0 && <div className="empty-hint">No suppliers found.</div>}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Edit Supplier" : "Add Supplier"} onClose={() => setShowForm(false)} width={480}>
          <form onSubmit={handleSubmit} className="form-grid">
            {error && <div className="alert alert-error span-2">{error}</div>}
            <label className="field span-2">
              <span>Company Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="field">
              <span>Contact Person</span>
              <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </label>
            <label className="field">
              <span>Phone</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="field span-2">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="field span-2">
              <span>Address</span>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
            <div className="form-actions span-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Supplier"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function SupplierProducts({ supplierId }: { supplierId: number }) {
  const [products, setProducts] = useState<Array<{ id: number; name: string; sku: string; stockQty: number }>>([]);
  useEffect(() => {
    api.get<any>(`/suppliers/${supplierId}`).then((s) => setProducts(s.products ?? []));
  }, [supplierId]);
  return (
    <ul className="simple-list nested">
      {products.length === 0 && <li className="empty-hint">No products from this supplier yet.</li>}
      {products.map((p) => (
        <li key={p.id} className="simple-list-item">
          <div className="simple-list-main">
            <div className="simple-list-title">{p.name}</div>
            <div className="simple-list-sub mono">{p.sku}</div>
          </div>
          <div className="simple-list-value">{p.stockQty} in stock</div>
        </li>
      ))}
    </ul>
  );
}

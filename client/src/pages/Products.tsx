import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Category, Product, Supplier } from "../api/types";
import Modal from "../components/Modal";
import Badge from "../components/Badge";
import { formatMoney } from "../lib/format";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  sku: "",
  name: "",
  description: "",
  ageRange: "",
  costPrice: "0",
  price: "",
  stockQty: "0",
  reorderLevel: "5",
  categoryId: "",
  supplierId: "",
};

export default function Products() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([
        api.get<Product[]>("/products"),
        api.get<Category[]>("/categories"),
        api.get<Supplier[]>("/suppliers"),
      ]);
      setProducts(p);
      setCategories(c);
      setSuppliers(s);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter && String(p.categoryId) !== categoryFilter) return false;
      if (lowStockOnly && p.stockQty > p.reorderLevel) return false;
      if (search && !`${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, categoryFilter, lowStockOnly, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description ?? "",
      ageRange: p.ageRange ?? "",
      costPrice: String(p.costPrice),
      price: String(p.price),
      stockQty: String(p.stockQty),
      reorderLevel: String(p.reorderLevel),
      categoryId: p.categoryId ? String(p.categoryId) : "",
      supplierId: p.supplierId ? String(p.supplierId) : "",
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        ageRange: form.ageRange.trim() || null,
        costPrice: Number(form.costPrice) || 0,
        price: Number(form.price),
        stockQty: Number(form.stockQty) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        supplierId: form.supplierId ? Number(form.supplierId) : null,
      };
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
      } else {
        await api.post("/products", payload);
      }
      setShowForm(false);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Deactivate "${p.name}"? It will be hidden from the catalog.`)) return;
    await api.delete(`/products/${p.id}`);
    await loadAll();
  }

  async function handleAddCategory(e: FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await api.post("/categories", { name: newCategoryName.trim() });
    setNewCategoryName("");
    setShowCategoryForm(false);
    await loadAll();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p className="page-subtitle">{products.length} products in the catalog</p>
        </div>
        {canManage && (
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => setShowCategoryForm(true)}>
              + Category
            </button>
            <button className="btn btn-primary" onClick={openCreate}>
              + Add Product
            </button>
          </div>
        )}
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="checkbox-field">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {loading ? (
        <div className="page-loading">Loading products&hellip;</div>
      ) : (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="cell-title">{p.name}</div>
                    <div className="cell-sub">{p.ageRange ? `Ages ${p.ageRange}` : ""}</div>
                  </td>
                  <td className="mono">{p.sku}</td>
                  <td>{p.category?.name ?? "—"}</td>
                  <td>{formatMoney(p.price)}</td>
                  <td>
                    <Badge tone={p.stockQty === 0 ? "danger" : p.stockQty <= p.reorderLevel ? "warning" : "success"}>
                      {p.stockQty} in stock
                    </Badge>
                  </td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setStockTarget(p)}>
                      Adjust Stock
                    </button>
                    {canManage && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                          Edit
                        </button>
                        <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(p)}>
                          Deactivate
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-hint">
                    No products match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Edit Product" : "Add Product"} onClose={() => setShowForm(false)} width={560}>
          <form onSubmit={handleSubmit} className="form-grid">
            {formError && <div className="alert alert-error span-2">{formError}</div>}
            <label className="field">
              <span>SKU</span>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            </label>
            <label className="field">
              <span>Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="field span-2">
              <span>Description</span>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </label>
            <label className="field">
              <span>Age Range</span>
              <input placeholder="e.g. 5+" value={form.ageRange} onChange={(e) => setForm({ ...form, ageRange: e.target.value })} />
            </label>
            <label className="field">
              <span>Category</span>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Supplier</span>
              <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">None</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Cost Price</span>
              <input type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
            </label>
            <label className="field">
              <span>Sell Price</span>
              <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </label>
            {!editing && (
              <label className="field">
                <span>Initial Stock</span>
                <input type="number" min="0" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} />
              </label>
            )}
            <label className="field">
              <span>Reorder Level</span>
              <input type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </label>
            <div className="form-actions span-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Product"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showCategoryForm && (
        <Modal title="Add Category" onClose={() => setShowCategoryForm(false)} width={400}>
          <form onSubmit={handleAddCategory} className="form-grid">
            <label className="field span-2">
              <span>Category name</span>
              <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} autoFocus required />
            </label>
            <div className="form-actions span-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCategoryForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add
              </button>
            </div>
          </form>
        </Modal>
      )}

      {stockTarget && (
        <StockAdjustModal
          product={stockTarget}
          onClose={() => setStockTarget(null)}
          onSaved={async () => {
            setStockTarget(null);
            await loadAll();
          }}
        />
      )}
    </div>
  );
}

function StockAdjustModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<"RESTOCK" | "ADJUSTMENT" | "RETURN">("RESTOCK");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const qty = Number(quantity);
      const signedQty = type === "ADJUSTMENT" ? qty : Math.abs(qty);
      await api.post(`/products/${product.id}/stock`, { type, quantity: signedQty, note: note.trim() || null });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to adjust stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Adjust Stock — ${product.name}`} onClose={onClose} width={420}>
      <form onSubmit={handleSubmit} className="form-grid">
        {error && <div className="alert alert-error span-2">{error}</div>}
        <div className="span-2 cell-sub">Current stock: {product.stockQty}</div>
        <label className="field">
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="RESTOCK">Restock (+)</option>
            <option value="RETURN">Customer Return (+)</option>
            <option value="ADJUSTMENT">Manual Adjustment (+/-)</option>
          </select>
        </label>
        <label className="field">
          <span>Quantity</span>
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </label>
        <label className="field span-2">
          <span>Note (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. supplier delivery" />
        </label>
        <div className="form-actions span-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Apply"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

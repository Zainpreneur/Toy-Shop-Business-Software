import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Customer, Order, PaymentMethod, Product } from "../api/types";
import { formatMoney } from "../lib/format";
import Modal from "../components/Modal";

interface CartLine {
  product: Product;
  quantity: number;
}

const TAX_RATE = 0.07;

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

  useEffect(() => {
    api.get<Product[]>("/products?activeOnly=true").then(setProducts);
    api.get<Customer[]>("/customers").then(setCustomers);
  }, []);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.slice(0, 30);
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 30);
  }, [products, search]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQty) return prev;
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (product.stockQty <= 0) return prev;
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: number, quantity: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.product.id === productId ? { ...l, quantity: Math.max(0, Math.min(quantity, l.product.stockQty)) } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(productId: number) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const subtotal = cart.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  const discountValue = Math.min(Number(discount) || 0, subtotal);
  const taxable = Math.max(subtotal - discountValue, 0);
  const tax = taxable * TAX_RATE;
  const total = taxable + tax;

  async function checkout() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.post<Order>("/orders", {
        customerId: customerId ? Number(customerId) : null,
        paymentMethod,
        discount: discountValue,
        taxRate: TAX_RATE,
        status: "PAID",
        items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      });
      setReceipt(order);
      setCart([]);
      setDiscount("0");
      setCustomerId("");
      const fresh = await api.get<Product[]>("/products?activeOnly=true");
      setProducts(fresh);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page pos-page">
      <div className="page-header">
        <div>
          <h1>Sales / POS</h1>
          <p className="page-subtitle">Ring up a sale for a customer at the register.</p>
        </div>
      </div>

      <div className="pos-layout">
        <div className="card pos-catalog">
          <input className="search-input" placeholder="Search toys by name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          <div className="pos-product-grid">
            {filteredProducts.map((p) => (
              <button key={p.id} className="pos-product-card" disabled={p.stockQty <= 0} onClick={() => addToCart(p)}>
                <div className="pos-product-name">{p.name}</div>
                <div className="pos-product-meta">
                  <span>{formatMoney(p.price)}</span>
                  <span className={p.stockQty <= p.reorderLevel ? "text-warning" : "text-muted"}>{p.stockQty} left</span>
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && <div className="empty-hint">No matching products.</div>}
          </div>
        </div>

        <div className="card pos-cart">
          <h3>Current Sale</h3>
          <div className="pos-cart-lines">
            {cart.length === 0 && <div className="empty-hint">Cart is empty. Tap a product to add it.</div>}
            {cart.map((l) => (
              <div className="pos-cart-line" key={l.product.id}>
                <div className="pos-cart-line-main">
                  <div className="cell-title">{l.product.name}</div>
                  <div className="cell-sub">{formatMoney(l.product.price)} each</div>
                </div>
                <div className="qty-stepper">
                  <button type="button" onClick={() => updateQty(l.product.id, l.quantity - 1)}>
                    −
                  </button>
                  <span>{l.quantity}</span>
                  <button type="button" onClick={() => updateQty(l.product.id, l.quantity + 1)}>
                    +
                  </button>
                </div>
                <div className="pos-line-total">{formatMoney(l.product.price * l.quantity)}</div>
                <button className="remove-btn" onClick={() => removeLine(l.product.id)} aria-label="Remove">
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="pos-cart-footer">
            <label className="field">
              <span>Customer (optional)</span>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Payment Method</span>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="ONLINE">Online</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="field">
              <span>Discount ($)</span>
              <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </label>

            <div className="pos-totals">
              <div>
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div>
                <span>Discount</span>
                <span>-{formatMoney(discountValue)}</span>
              </div>
              <div>
                <span>Tax (7%)</span>
                <span>{formatMoney(tax)}</span>
              </div>
              <div className="pos-total-grand">
                <span>Total</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button className="btn btn-primary btn-block btn-lg" disabled={cart.length === 0 || submitting} onClick={checkout}>
              {submitting ? "Processing…" : `Charge ${formatMoney(total)}`}
            </button>
          </div>
        </div>
      </div>

      {receipt && (
        <Modal title="Sale Complete 🎉" onClose={() => setReceipt(null)} width={420}>
          <div className="receipt">
            <div className="receipt-row">
              <strong>Order</strong>
              <span className="mono">{receipt.orderNumber}</span>
            </div>
            <hr />
            {receipt.items.map((it) => (
              <div className="receipt-row" key={it.id}>
                <span>
                  {it.product.name} × {it.quantity}
                </span>
                <span>{formatMoney(it.lineTotal)}</span>
              </div>
            ))}
            <hr />
            <div className="receipt-row">
              <span>Subtotal</span>
              <span>{formatMoney(receipt.subtotal)}</span>
            </div>
            <div className="receipt-row">
              <span>Discount</span>
              <span>-{formatMoney(receipt.discount)}</span>
            </div>
            <div className="receipt-row">
              <span>Tax</span>
              <span>{formatMoney(receipt.tax)}</span>
            </div>
            <div className="receipt-row receipt-total">
              <span>Total</span>
              <span>{formatMoney(receipt.total)}</span>
            </div>
            <button className="btn btn-primary btn-block" onClick={() => setReceipt(null)} style={{ marginTop: 16 }}>
              Start Next Sale
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

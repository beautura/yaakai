"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  Check,
  CircleDollarSign,
  Eye,
  EyeOff,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Package,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "@/components/site-shell";
import { indiaStates } from "@/lib/india-states";
import { getDateRange, isWithinDateRange, localDateValue, type PeriodMode } from "@/lib/date-range";
import {
  formatAdminPrice,
  orderStatuses,
  type AdminOrder,
  type AdminProduct,
  type Expense,
  type InventoryItem,
  type OrderStatus,
  type StoreSettings,
} from "@/lib/admin-data";
import {
  getAdminServerSnapshot,
  getAdminSnapshot,
  loadAdminData,
  resetAdminData,
  subscribeAdmin,
  updateAdminData,
} from "@/lib/admin-store";

type View =
  | "dashboard"
  | "orders"
  | "products"
  | "stock"
  | "expenses"
  | "customers"
  | "settings";
type ProductDraft = Omit<AdminProduct, "id"> & { id?: string };
type InventoryDraft = Omit<InventoryItem, "id"> & { id?: string };

const navigation: { id: View; label: string; icon: typeof LayoutDashboard }[] =
  [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "products", label: "Products", icon: Package },
    { id: "stock", label: "Stock", icon: Boxes },
    { id: "expenses", label: "Expenses", icon: Receipt },
    { id: "customers", label: "Customers", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

const today = () => localDateValue(new Date());
const titleFor: Record<View, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  products: "Products",
  stock: "Stock",
  expenses: "Expenses",
  customers: "Customers",
  settings: "Settings",
};

function LoginScreen({
  onLogin,
}: {
  onLogin: (username: string, password: string) => Promise<string | null>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await onLogin(username, password);
    setError(result || "");
    setBusy(false);
  }
  return (
    <main className="admin-login-page">
      <div className="admin-login-shell">
        <section className="admin-login-brand" aria-label="Yaakai">
          <Image className="admin-login-brand-logo" src="/images/yaakai/admin-login-brand.png" alt="Yaakai - goodness infused" width={150} height={143} priority />
          <div>
            <h1>Traditional goodness, <em>managed with care.</em></h1>
            <p>Traditional Tamil flavours, thoughtfully crafted for everyday life.</p>
          </div>
        </section>
        <section className="admin-login" aria-labelledby="admin-login-title">
          <Image className="admin-login-card-logo" src="/images/yaakai/admin-login-logo.png" alt="Yaakai" width={108} height={103} priority />
          <div className="admin-login-head">
            <span className="admin-login-badge">Admin portal</span>
            <h2 id="admin-login-title">Welcome back</h2>
            <p>Sign in to manage your Yaakai store</p>
          </div>
          <form onSubmit={submit}>
            <div className="login-field">
              <label htmlFor="admin-username">Username</label>
              <div className="login-input">
                <UserRound size={18} aria-hidden="true" />
                <input id="admin-username" name="username" type="text" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="admin-password">Password</label>
              <div className="login-input">
                <LockKeyhole size={18} aria-hidden="true" />
                <input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
                <button type="button" className="login-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            {error && <p className="admin-login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in to dashboard"}</button>
          </form>
          <p className="admin-login-foot">Authorised staff only.<br />© {new Date().getFullYear()} Yaakai · goodness infused</p>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
  trend,
  negative = false,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Wallet;
  trend?: string;
  negative?: boolean;
}) {
  return (
    <article className="metric">
      <div className="metric-heading">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon size={18} />
        </span>
      </div>
      <strong className="metric-value">{value}</strong>
      <div className="metric-foot">
        {trend && (
          <span className={`metric-trend${negative ? " negative" : ""}`}>
            {negative ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            {trend}
          </span>
        )}
        <span>{note}</span>
      </div>
    </article>
  );
}

function StatusTag({ value }: { value: string }) {
  return (
    <span
      className={`status-tag status-${value.toLowerCase().replaceAll(" ", "-")}`}
    >
      {value}
    </span>
  );
}

function OrdersTable({
  orders,
  onStatus,
  onOpen,
}: {
  orders: AdminOrder[];
  onStatus: (orderId: string, status: OrderStatus) => void;
  onOpen: (order: AdminOrder) => void;
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <button className="table-link" onClick={() => onOpen(order)}>
                  {order.orderNumber}
                </button>
              </td>
              <td>
                <span className="table-primary">{order.customer}</span>
                <small>{order.email}</small>
              </td>
              <td>
                {new Date(`${order.date}T12:00:00`).toLocaleDateString(
                  "en-IN",
                  { day: "2-digit", month: "short", year: "numeric" },
                )}
              </td>
              <td className="table-primary">{formatAdminPrice(order.total)}</td>
              <td>
                <StatusTag value={order.payment} />
              </td>
              <td>
                <select
                  className="status-select"
                  aria-label={`Update status for ${order.orderNumber}`}
                  value={order.status}
                  onChange={(event) =>
                    onStatus(order.id, event.target.value as OrderStatus)
                  }
                >
                  {orderStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && (
        <p className="table-empty">No orders match this view.</p>
      )}
    </div>
  );
}

function ProductEditor({
  product,
  onClose,
  onSave,
}: {
  product: AdminProduct | null;
  onClose: () => void;
  onSave: (draft: ProductDraft, image: File | null, removeImage: boolean) => Promise<string | null>;
}) {
  const [id] = useState(() => product?.id || `yaakai-${crypto.randomUUID()}`);
  const [variants, setVariants] = useState(() => (product?.variants?.length ? product.variants : [{ weight: "Standard", price: product?.price ?? 0 }]).map((variant) => ({ ...variant, key: crypto.randomUUID() })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-editor-title"
      >
        <div className="modal-heading">
          <div>
            <p className="admin-kicker">CATALOGUE</p>
            <h2 id="product-editor-title">
              {product ? "Edit product" : "Add product"}
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            const fields = new FormData(event.currentTarget);
            const file = fields.get("image");
            setBusy(true);
            setError("");
            const result = await onSave({
              id,
              name: String(fields.get("name")),
              category: String(fields.get("category")),
              sku: String(fields.get("sku")),
              price: variants[0]?.price ?? 0,
              cost: Number(fields.get("cost")),
              stock: Number(fields.get("stock")),
              status: String(fields.get("status")) as AdminProduct["status"],
              description: String(fields.get("description")),
              ingredients: String(fields.get("ingredients")),
              imagePath: product?.imagePath || "",
              imageAlt: String(fields.get("imageAlt")),
              featured: fields.has("featured"),
              variants: variants.map(({ weight, price }) => ({ weight, price })),
            }, file instanceof File && file.size ? file : null, fields.has("removeImage"));
            if (result) setError(result);
            setBusy(false);
          }}
        >
          <div className="admin-form-grid">
            <label className="form-wide">
              Product name
              <input name="name" defaultValue={product?.name} required />
            </label>
            <label>
              Category
              <input
                name="category"
                defaultValue={product?.category}
                required
              />
            </label>
            <label>
              SKU
              <input name="sku" defaultValue={product?.sku} required />
            </label>
            <label>
              Unit cost
              <input
                name="cost"
                type="number"
                min="0"
                step="0.01"
                defaultValue={product?.cost}
                required
              />
            </label>
            <label>
              Finished-product stock
              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                defaultValue={product?.stock ?? 0}
                required
              />
            </label>
            <label>
              Status
              <select name="status" defaultValue={product?.status || "Active"}>
                <option>Active</option>
                <option>Draft</option>
              </select>
            </label>
            <label className="form-wide">Description<textarea name="description" rows={3} maxLength={5000} defaultValue={product?.description || ""} /></label>
            <label className="form-wide">Ingredients<textarea name="ingredients" rows={3} maxLength={5000} defaultValue={product?.ingredients || ""} /></label>
            <label className="form-wide">Image description<input name="imageAlt" maxLength={200} defaultValue={product?.imageAlt || ""} /></label>
            {product?.imagePath && <div className="form-wide product-image-preview"><Image src={product.imagePath} alt={product.imageAlt || product.name} width={110} height={90} unoptimized /></div>}
            <label className="form-wide">Product image (PNG, JPEG or WebP, up to 5 MB)<input name="image" type="file" accept="image/png,image/jpeg,image/webp" /></label>
            {product?.imagePath && <label className="form-wide product-checkbox"><input name="removeImage" type="checkbox" /> Remove current image</label>}
            <label className="form-wide product-checkbox"><input name="featured" type="checkbox" defaultChecked={product?.featured || false} /> Feature on the homepage</label>
            <div className="form-wide product-variants"><strong>Weights and prices</strong>{variants.map((variant, index) => <div className="product-variant" key={variant.key}><label>Weight {index + 1}<input maxLength={60} value={variant.weight} onChange={(event) => setVariants((current) => current.map((item) => item.key === variant.key ? { ...item, weight: event.target.value } : item))} required /></label><label>Price<input type="number" min="0" max="1000000000" step="0.01" value={variant.price} onChange={(event) => setVariants((current) => current.map((item) => item.key === variant.key ? { ...item, price: Number(event.target.value) } : item))} required /></label><button className="icon-action danger-action" type="button" title="Remove weight" aria-label={`Remove weight ${index + 1}`} disabled={variants.length === 1} onClick={() => setVariants((current) => current.filter((item) => item.key !== variant.key))}><Trash2 size={15} /></button></div>)}<button className="admin-link-button" type="button" disabled={variants.length >= 20} onClick={() => setVariants((current) => [...current, { key: crypto.randomUUID(), weight: "", price: 0 }])}><Plus size={15} /> Add weight</button></div>
          </div>
          {error && <p className="admin-form-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="admin-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="admin-primary" disabled={busy}>
              <Check size={15} /> {busy ? "Saving..." : "Save product"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function InventoryEditor({
  item,
  onClose,
  onSave,
}: {
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (draft: InventoryDraft) => void;
}) {
  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-editor-title"
      >
        <div className="modal-heading">
          <div>
            <p className="admin-kicker">INVENTORY</p>
            <h2 id="inventory-editor-title">
              {item ? "Edit inventory item" : "Add inventory item"}
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            onSave({
              id: item?.id,
              name: String(fields.get("name")),
              sku: String(fields.get("sku")),
              type: String(fields.get("type")) as InventoryItem["type"],
              unit: String(fields.get("unit")),
              onHand: Number(fields.get("onHand")),
              reorderLevel: Number(fields.get("reorderLevel")),
              costPerUnit: Number(fields.get("costPerUnit")),
              supplier: String(fields.get("supplier")),
            });
          }}
        >
          <div className="admin-form-grid">
            <label className="form-wide">
              Item name
              <input name="name" defaultValue={item?.name} required />
            </label>
            <label>
              Type
              <select name="type" defaultValue={item?.type || "Raw material"}>
                <option>Raw material</option>
                <option>Store stock</option>
              </select>
            </label>
            <label>
              SKU
              <input name="sku" defaultValue={item?.sku} required />
            </label>
            <label>
              Unit
              <input
                name="unit"
                defaultValue={item?.unit || "kg"}
                required
                placeholder="kg, L, pcs"
              />
            </label>
            <label>
              On hand
              <input
                name="onHand"
                type="number"
                min="0"
                step="0.001"
                defaultValue={item?.onHand ?? 0}
                required
              />
            </label>
            <label>
              Reorder level
              <input
                name="reorderLevel"
                type="number"
                min="0"
                step="0.001"
                defaultValue={item?.reorderLevel ?? 0}
                required
              />
            </label>
            <label>
              Cost per unit (₹)
              <input
                name="costPerUnit"
                type="number"
                min="0"
                step="0.01"
                defaultValue={item?.costPerUnit ?? 0}
                required
              />
            </label>
            <label className="form-wide">
              Supplier
              <input name="supplier" defaultValue={item?.supplier} />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="admin-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="admin-primary">
              <Check size={15} /> Save inventory
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState<{ username: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load admin users. Check the database setup.");
    const result = await response.json() as { users: { username: string }[] };
    setUsers(result.users);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/users", { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error("Could not load admin users. Check the database setup.");
      return response.json() as Promise<{ users: { username: string }[] }>;
    }).then((result) => { if (active) setUsers(result.users); }).catch((failure) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const username = selected || String(fields.get("username") || "");
    const password = String(fields.get("password") || "");
    if (password !== fields.get("confirmPassword")) { setError("Passwords do not match."); return; }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", { method: selected ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save the user.");
      form.reset();
      setSelected(null);
      setMessage(selected ? "Password updated. The user must sign in again." : "Admin user created.");
      await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save the user."); }
    finally { setBusy(false); }
  }

  async function remove(username: string) {
    if (!window.confirm(`Remove admin user ${username}? Their sessions will stop working.`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not remove the user.");
      if (selected === username) setSelected(null);
      setMessage("Admin user removed.");
      await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not remove the user."); }
    finally { setBusy(false); }
  }

  return <section className="admin-panel"><div className="panel-heading"><div><h2>Admin users</h2><p>All users have full admin access.</p></div></div><div className="payment-qr-controls">
    {users.map((user) => <div className="admin-user-row" key={user.username}><strong>{user.username}</strong><div className="row-actions"><button className="icon-action" type="button" title="Change password" aria-label={`Change password for ${user.username}`} onClick={() => { setSelected(user.username); setMessage(""); setError(""); }} disabled={busy}><Pencil size={15} /></button><button className="icon-action danger-action" type="button" title="Remove user" aria-label={`Remove ${user.username}`} onClick={() => void remove(user.username)} disabled={busy}><Trash2 size={15} /></button></div></div>)}
    <form className="admin-user-form" onSubmit={save} key={selected || "new"}><strong>{selected ? `Change password: ${selected}` : "Add user"}</strong>{!selected && <label>Username<input name="username" minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" autoComplete="off" required /></label>}<label>Password<input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label><label>Confirm password<input name="confirmPassword" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label><div className="payment-qr-actions"><button className="admin-primary" type="submit" disabled={busy}>{selected ? "Update password" : "Add user"}</button>{selected && <button className="admin-secondary" type="button" onClick={() => setSelected(null)}>Cancel</button>}</div></form>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </div></section>;
}

function WhatsAppSettings() {
  const [status, setStatus] = useState("disconnected");
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/admin/whatsapp", { cache: "no-store" });
        if (!response.ok) throw new Error("WhatsApp status is unavailable.");
        const result = await response.json() as { status: string; qr: string | null };
        if (active) { setStatus(result.status); setQr(result.qr); }
      } catch { if (active) setError("WhatsApp status is unavailable."); }
    }
    void refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/whatsapp", { method: "POST" });
      const result = await response.json() as { status?: string; qr?: string | null; error?: string };
      if (!response.ok) throw new Error(result.error || "Could not connect WhatsApp.");
      setStatus(result.status || "connecting");
      setQr(result.qr || null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not connect WhatsApp."); }
    finally { setBusy(false); }
  }

  async function reset() {
    if (!window.confirm("Disconnect WhatsApp and remove its saved session?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/whatsapp", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not disconnect WhatsApp.");
      setStatus("disconnected");
      setQr(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not disconnect WhatsApp."); }
    finally { setBusy(false); }
  }

  return <section className="admin-panel"><div className="panel-heading"><div><h2>WhatsApp</h2><p>Order confirmations</p></div></div><div className="payment-qr-controls"><p>Status: <strong>{status}</strong></p>{qr && <><Image src={qr} alt="WhatsApp pairing QR code" width={256} height={256} unoptimized /><p>Scan with WhatsApp Linked Devices on the store phone.</p></>}<div className="payment-qr-actions">{status === "disconnected" && <button className="admin-primary" type="button" onClick={connect} disabled={busy}>{busy ? "Connecting..." : "Connect WhatsApp"}</button>}<button className="admin-secondary" type="button" onClick={reset} disabled={busy}>Reset session</button></div>{error && <p role="alert">{error}</p>}</div></section>;
}

function PaymentQrSettings() {
  const [version, setVersion] = useState(0);
  const [hasQr, setHasQr] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/payment-qr?v=${version}`, { cache: "no-store" }).then((response) => setHasQr(response.ok)).catch(() => setHasQr(false));
  }, [version]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/payment-qr", { method: "POST", body: new FormData(form) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save the payment QR.");
      form.reset();
      setVersion((current) => current + 1);
      setMessage("Payment QR saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the payment QR."); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/payment-qr", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setVersion((current) => current + 1);
      setMessage("Payment QR removed.");
    } catch { setMessage("Could not remove the payment QR."); }
    finally { setBusy(false); }
  }

  return <section className="admin-panel payment-qr-settings"><div className="panel-heading"><div><h2>Payment QR</h2><p>Shown to customers after placing an order.</p></div></div><div className="payment-qr-controls">{hasQr && <Image src={`/api/payment-qr?v=${version}`} alt="Current payment QR code" width={150} height={150} unoptimized />}<form onSubmit={save}><label>QR image<input name="image" type="file" accept="image/png,image/jpeg,image/webp" required /></label><div className="payment-qr-actions"><button className="admin-primary" type="submit" disabled={busy}>Save QR</button>{hasQr && <button className="admin-secondary" type="button" disabled={busy} onClick={remove}>Remove</button>}</div></form>{message && <p role="status">{message}</p>}</div></section>;
}

function ManualOrderEditor({ products, onClose, onCreated }: { products: AdminProduct[]; onClose: () => void; onCreated: (orderNumber: string) => Promise<void> }) {
  const activeProducts = products.filter((product) => product.status === "Active");
  const [id] = useState(() => crypto.randomUUID());
  const [items, setItems] = useState(() => [{ key: crypto.randomUUID(), productId: activeProducts[0]?.id || "", quantity: 1 }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = items.reduce((sum, item) => sum + (activeProducts.find((product) => product.id === item.productId)?.price || 0) * item.quantity, 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(form.entries()), id, items: items.map(({ productId, quantity }) => ({ productId, quantity })) }) });
      const result = await response.json() as { orderNumber?: string; error?: string };
      if (!response.ok || !result.orderNumber) throw new Error(result.error || "Could not create the order.");
      await onCreated(result.orderNumber);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not create the order."); }
    finally { setBusy(false); }
  }

  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="manual-order-title"><div className="modal-heading"><div><p className="admin-kicker">ORDERS</p><h2 id="manual-order-title">Create order</h2></div><button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={19} /></button></div><form onSubmit={submit}><div className="admin-form-grid">
    <label>Customer name<input name="name" maxLength={100} required /></label><label>Order date<input name="date" type="date" defaultValue={today()} required /></label><label>Phone (optional)<input name="phone" type="tel" maxLength={24} /></label><label>Email (optional)<input name="email" type="email" maxLength={254} /></label><label className="form-wide">Address (optional)<input name="address" maxLength={200} /></label><label>City (optional)<input name="city" maxLength={100} /></label><label>State or union territory (optional)<select name="state" defaultValue=""><option value="">Select a state</option>{indiaStates.map((state) => <option key={state}>{state}</option>)}</select></label><label>PIN code (optional)<input name="postalCode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} /></label>
    <div className="form-wide manual-order-items"><strong>Products</strong>{items.map((item, index) => <div className="manual-order-item" key={item.key}><label>Product {index + 1}<select value={item.productId} onChange={(event) => setItems((current) => current.map((entry) => entry.key === item.key ? { ...entry, productId: event.target.value } : entry))} required><option value="" disabled>Select a product</option>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name} - {formatAdminPrice(product.price)}</option>)}</select></label><label>Quantity<input type="number" min="1" max="10000" value={item.quantity} onChange={(event) => setItems((current) => current.map((entry) => entry.key === item.key ? { ...entry, quantity: Number(event.target.value) } : entry))} required /></label><button className="icon-action danger-action" type="button" aria-label={`Remove product ${index + 1}`} title="Remove product" onClick={() => setItems((current) => current.filter((entry) => entry.key !== item.key))} disabled={items.length === 1}><Trash2 size={15} /></button></div>)}<button className="admin-link-button" type="button" disabled={!activeProducts.length || items.length >= 20} onClick={() => setItems((current) => [...current, { key: crypto.randomUUID(), productId: activeProducts[0]?.id || "", quantity: 1 }])}><Plus size={15} /> Add product</button>{!activeProducts.length && <p>Add an active product before creating an order.</p>}<strong>Total: {formatAdminPrice(total)}</strong></div>
  </div>{error && <p role="alert" className="admin-form-error">{error}</p>}<div className="modal-actions"><button className="admin-secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="admin-primary" type="submit" disabled={busy || !activeProducts.length}>{busy ? "Creating..." : "Create order"}</button></div></form></section></div>;
}

function OrderDetails({
  order,
  onClose,
  onStatus,
  onPayment,
}: {
  order: AdminOrder;
  onClose: () => void;
  onStatus: (orderId: string, status: OrderStatus) => void;
  onPayment: (orderId: string, payment: AdminOrder["payment"]) => void;
}) {
  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="admin-modal order-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
      >
        <div className="modal-heading">
          <div>
            <p className="admin-kicker">ORDER DETAILS</p>
            <h2 id="order-detail-title">{order.orderNumber}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        <div className="order-customer">
          <strong>{order.customer}</strong>
          <span>{order.email}</span>
          <span>{order.phone}</span>
          {order.deliveryAddress?.address && <span>{[order.deliveryAddress.address, order.deliveryAddress.address2, order.deliveryAddress.city, order.deliveryAddress.state, order.deliveryAddress.postalCode, order.deliveryAddress.country].filter(Boolean).join(", ")}</span>}
        </div>
        <div className="order-lines">
          {order.items.map((item, index) => (
            <div key={`${item}-${index}`}>
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="order-total">
          <span>Order total</span>
          <strong>{formatAdminPrice(order.total)}</strong>
        </div>
        <label className="status-editor">
          Fulfilment status
          <select
            value={order.status}
            onChange={(event) =>
              onStatus(order.id, event.target.value as OrderStatus)
            }
          >
            {orderStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="status-editor">
          Payment status
          <select value={order.payment} onChange={(event) => onPayment(order.id, event.target.value as AdminOrder["payment"])}>
            <option>Awaiting payment</option>
            <option>Paid</option>
            <option>Refunded</option>
          </select>
        </label>
      </section>
    </div>
  );
}

export function AdminPanel() {
  const {
    data,
    ready,
    error: dataError,
  } = useSyncExternalStore(
    subscribeAdmin,
    getAdminSnapshot,
    getAdminServerSnapshot,
  );
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("all");
  const [periodDay, setPeriodDay] = useState(() => localDateValue(new Date()));
  const [periodMonth, setPeriodMonth] = useState(() => localDateValue(new Date()).slice(0, 7));
  const [periodFrom, setPeriodFrom] = useState(() => localDateValue(new Date()).slice(0, 8) + "01");
  const [periodTo, setPeriodTo] = useState(() => localDateValue(new Date()));
  const [query, setQuery] = useState("");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [productEditor, setProductEditor] = useState<
    AdminProduct | null | undefined
  >(undefined);
  const [inventoryEditor, setInventoryEditor] = useState<
    InventoryItem | null | undefined
  >(undefined);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [manualOrder, setManualOrder] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return false;
        const session = (await response.json()) as { authenticated?: boolean };
        if (!session.authenticated) return false;
        await loadAdminData();
        return true;
      })
      .then((isAuthenticated) => {
        if (active) setAuthenticated(isAuthenticated);
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function login(username: string, password: string) {
    let response: Response;
    try {
      response = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
    } catch {
      return "Could not reach the admin server.";
    }
    if (!response.ok) {
      try {
        return (
          ((await response.json()) as { error?: string }).error ||
          "Sign-in failed."
        );
      } catch {
        return "Sign-in failed.";
      }
    }
    try {
      await loadAdminData();
      setAuthenticated(true);
      return null;
    } catch (error) {
      await fetch("/api/admin/session", { method: "DELETE" });
      return error instanceof Error
        ? error.message
        : "Could not load PostgreSQL admin data.";
    }
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    resetAdminData();
    setView("dashboard");
  }

  const dateRange = getDateRange(periodMode, periodDay, periodMonth, periodFrom, periodTo, new Date());
  const periodOrders = data.orders.filter((order) => isWithinDateRange(order.date, dateRange));
  const periodExpenses = data.expenses.filter((expense) => isWithinDateRange(expense.date, dateRange));
  const paidOrders = periodOrders.filter(
    (order) => order.payment === "Paid" && order.status !== "Cancelled",
  );
  const sales = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const productCost = paidOrders.reduce((sum, order) => sum + order.cost, 0);
  const grossProfit = sales - productCost;
  const expensesTotal = periodExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const netProfit = grossProfit - expensesTotal;
  const margin = sales === 0 ? 0 : Math.round((grossProfit / sales) * 100);
  const lowStock = data.products.filter(
    (product) => product.stock <= data.settings.lowStockThreshold,
  );
  const lowInventory = data.inventory.filter(
    (item) => item.onHand <= item.reorderLevel,
  );
  const canceledLoss = periodOrders
    .filter((order) => order.status === "Cancelled")
    .reduce((sum, order) => sum + order.total, 0);

  async function persist(
    update: (current: typeof data) => typeof data,
    message: string,
  ) {
    const saved = await updateAdminData(update);
    setNotice(
      saved
        ? `${message} Saved to PostgreSQL.`
        : "Save failed. Check the PostgreSQL connection and retry.",
    );
    return saved;
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    await updateOrder(orderId, { status });
  }

  async function updateOrder(orderId: string, changes: { status?: OrderStatus; payment?: AdminOrder["payment"] }) {
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, ...changes }),
      });
      if (!response.ok) throw new Error("Could not update the order.");
      const refreshed = await loadAdminData();
      setSelectedOrder((current) => current?.id === orderId ? refreshed.orders.find((order) => order.id === orderId) ?? null : current);
      setNotice(`${refreshed.orders.find((order) => order.id === orderId)?.orderNumber || "Order"} updated.`);
    } catch {
      setNotice("Order update failed. Please retry.");
    }
  }

  async function saveProduct(draft: ProductDraft, image: File | null, removeImage: boolean) {
    const form = new FormData();
    form.set("product", JSON.stringify(draft));
    if (image) form.set("image", image);
    if (removeImage) form.set("removeImage", "true");
    try {
      const response = await fetch("/api/admin/products", { method: "PUT", body: form });
      const result = await response.json() as { error?: string };
      if (!response.ok) return result.error || "Could not save the product.";
      await loadAdminData();
      window.dispatchEvent(new Event("yaakai:products-changed"));
      setProductEditor(undefined);
      setNotice("Product saved.");
      return null;
    } catch { return "Could not save or refresh the product. Please try again."; }
  }

  async function deleteProduct(product: AdminProduct) {
    if (!window.confirm(`Remove ${product.name} from the catalogue?`)) return;
    try {
      const response = await fetch("/api/admin/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: product.id }) });
      if (!response.ok) throw new Error("Could not remove the product.");
      await loadAdminData();
      window.dispatchEvent(new Event("yaakai:products-changed"));
      setNotice(`${product.name} removed from catalogue.`);
    } catch { setNotice("Could not remove the product. Please retry."); }
  }

  async function saveInventory(draft: InventoryDraft) {
    const id = draft.id || `inventory-${Date.now()}`;
    const saved = await persist(
      (current) => ({
        ...current,
        inventory: draft.id
          ? current.inventory.map((item) =>
              item.id === draft.id ? { ...draft, id } : item,
            )
          : [{ ...draft, id }, ...current.inventory],
      }),
      draft.id ? "Inventory item updated." : "Inventory item added.",
    );
    if (saved) setInventoryEditor(undefined);
  }

  function setStock(id: string, onHand: number) {
    void persist(
      (current) => ({
        ...current,
        inventory: current.inventory.map((item) =>
          item.id === id ? { ...item, onHand: Math.max(0, onHand) } : item,
        ),
      }),
      "Inventory quantity updated.",
    );
  }

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const expense: Expense = {
      id: `EXP-${Date.now()}`,
      title: String(fields.get("title")),
      category: String(fields.get("category")),
      amount: Number(fields.get("amount")),
      date: String(fields.get("date")),
      note: String(fields.get("note")),
    };
    if (
      await persist(
        (current) => ({ ...current, expenses: [expense, ...current.expenses] }),
        "Expense recorded.",
      )
    )
      form.reset();
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const settings: StoreSettings = {
      storeName: String(fields.get("storeName")),
      address: String(fields.get("address")),
      phone: String(fields.get("phone")),
      lowStockThreshold: Number(fields.get("lowStockThreshold")),
      taxRate: Number(fields.get("taxRate")),
      currency: "INR",
    };
    await persist(
      (current) => ({ ...current, settings }),
      "Store settings saved.",
    );
  }

  if (checkingSession)
    return (
      <main className="admin-login-page">
        <p className="admin-loading">Checking admin session…</p>
      </main>
    );
  if (!authenticated) return <LoginScreen onLogin={login} />;

  const filteredOrders = periodOrders.filter((order) =>
    `${order.orderNumber} ${order.id} ${order.customer} ${order.email} ${order.status}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const filteredProducts = data.products.filter((product) =>
    `${product.name} ${product.category} ${product.sku}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const filteredInventory = data.inventory.filter((item) =>
    `${item.name} ${item.type} ${item.sku} ${item.supplier}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const monthlyRevenue = new Map<string, number>();
  for (const order of paidOrders) {
    const key = order.date.slice(0, 7);
    monthlyRevenue.set(key, (monthlyRevenue.get(key) || 0) + order.total);
  }
  const monthSeries = Array.from(monthlyRevenue.entries()).sort(([first], [second]) => first.localeCompare(second)).slice(-12).map(([key, total]) => ({
    key,
    label: new Date(`${key}-01T12:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
    total,
  }));
  const maximumMonth = Math.max(...monthSeries.map((month) => month.total), 1);

  const customers = Object.values(
    periodOrders.reduce<
      Record<
        string,
        {
          name: string;
          email: string;
          phone: string;
          orders: number;
          spend: number;
          lastOrder: string;
        }
      >
    >((result, order) => {
      const customerKey = (order.email || order.phone || order.customer || order.id).trim().toLowerCase();
      const current = result[customerKey] || {
        name: order.customer,
        email: order.email,
        phone: order.phone,
        orders: 0,
        spend: 0,
        lastOrder: order.date,
      };
      current.orders += order.status === "Cancelled" ? 0 : 1;
      current.spend +=
        order.payment === "Paid" && order.status !== "Cancelled"
          ? order.total
          : 0;
      if (order.date > current.lastOrder) current.lastOrder = order.date;
      result[customerKey] = current;
      return result;
    }, {}),
  ).filter((customer) =>
    `${customer.name} ${customer.email} ${customer.phone}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <main className="admin-root">
      <aside className={`admin-sidebar${mobileSidebar ? " is-open" : ""}`}>
        <div className="admin-brand">
          <Logo light />
          <span className="admin-brand-label">ADMIN</span>
          <button
            className="admin-close-mobile"
            aria-label="Close admin navigation"
            onClick={() => setMobileSidebar(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="admin-nav-label">WORKSPACE</div>
        <nav className="admin-nav" aria-label="Admin sections">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`admin-nav-item${view === id ? " active" : ""}`}
              onClick={() => {
                setView(id);
                setMobileSidebar(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "orders" && (
                <small>
                  {data.orders.filter((order) => order.status === "New").length}
                </small>
              )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <button
            className="admin-logout"
            onClick={() => void signOut()}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-menu-button"
            aria-label="Open admin navigation"
            onClick={() => setMobileSidebar(true)}
          >
            <Menu size={19} />
          </button>
          <div className="admin-breadcrumb">
            Yaakai <span>/</span> {titleFor[view]}
          </div>
          <div className="admin-top-actions">
            <label className="admin-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${view}...`}
                aria-label={`Search ${view}`}
              />
            </label>
            <span className="admin-avatar" aria-label="Admin user">
              YA
            </span>
          </div>
        </header>
        <div className="admin-content">
          <div className="admin-page-heading">
            <div>
              <p className="admin-kicker">STORE OPERATIONS</p>
              <h1>{titleFor[view]}</h1>
            </div>
            <div className="admin-today">
              <CalendarDays size={15} />
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
          {["dashboard", "orders", "expenses", "customers"].includes(view) && <div className="admin-period-filter" role="group" aria-label="Reporting period">
            <label>Period<select aria-label="Period" value={periodMode} onChange={(event) => setPeriodMode(event.target.value as PeriodMode)}><option value="all">All time</option><option value="today">Today</option><option value="this-month">This month</option><option value="last-month">Last month</option><option value="this-year">This year</option><option value="date">Select date</option><option value="month">Select month</option><option value="custom">Custom range</option></select></label>
            {periodMode === "date" && <label>Date<input aria-label="Date" type="date" value={periodDay} onChange={(event) => setPeriodDay(event.target.value)} /></label>}
            {periodMode === "month" && <label>Month<input aria-label="Month" type="month" value={periodMonth} onChange={(event) => setPeriodMonth(event.target.value)} /></label>}
            {periodMode === "custom" && <><label>From<input aria-label="From" type="date" value={periodFrom} onChange={(event) => setPeriodFrom(event.target.value)} /></label><label>To<input aria-label="To" type="date" value={periodTo} onChange={(event) => setPeriodTo(event.target.value)} /></label></>}
            {!dateRange.valid && <p role="alert">Select a valid date range.</p>}
          </div>}
          {!ready && (
            <p className="admin-loading">Loading PostgreSQL data…</p>
          )}
          {dataError && <p className="admin-db-error" role="alert">PostgreSQL save failed: {dataError}</p>}
          {notice && (
            <button className="admin-toast" onClick={() => setNotice("")}>
              <Check size={15} />
              {notice}
              <X size={14} />
            </button>
          )}
          {view === "dashboard" && (
            <section className="admin-view">
              <div className="metrics-grid">
                <Metric
                  label="Gross sales"
                  value={formatAdminPrice(sales)}
                  note={periodMode === "all" ? "Paid orders · all time" : "Paid orders · selected period"}
                  icon={CircleDollarSign}
                />
                <Metric
                  label="Gross margin"
                  value={`${margin}%`}
                  note={`${formatAdminPrice(grossProfit)} before expenses`}
                  icon={TrendingUp}
                />
                <Metric
                  label={netProfit < 0 ? "Net loss" : "Net profit"}
                  value={formatAdminPrice(Math.abs(netProfit))}
                  note={`${formatAdminPrice(expensesTotal)} expenses in period`}
                  icon={netProfit < 0 ? TrendingDown : Wallet}
                  negative={netProfit < 0}
                />
                <Metric
                  label="Open orders"
                  value={String(
                    periodOrders.filter(
                      (order) =>
                        !["Delivered", "Cancelled"].includes(order.status),
                    ).length,
                  )}
                  note={`${lowStock.length} finished products at low stock`}
                  icon={ShoppingBag}
                />
              </div>
              <div className="admin-dashboard-grid">
                <section className="admin-panel revenue-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Revenue overview</h2>
                      <p>{monthlyRevenue.size > 12 ? "Most recent 12 months in the selected period" : "Paid order revenue by month"}</p>
                    </div>
                    <span className="panel-period">{periodMode === "all" ? "All time" : "Selected period"}</span>
                  </div>
                  {monthSeries.length ? <div
                    className="revenue-chart"
                    aria-label="Monthly revenue chart"
                  >
                    {monthSeries.map((month) => (
                      <div
                        className="chart-column"
                        key={month.key}
                      >
                        <span className="chart-value" title={formatAdminPrice(month.total)}>
                          {formatAdminPrice(month.total)}
                        </span>
                        <span className="chart-track">
                          <span
                            className="chart-bar"
                            style={{
                              height: `${month.total ? Math.max(8, (month.total / maximumMonth) * 100) : 2}%`,
                            }}
                          />
                        </span>
                        <span className="chart-label">{month.label}</span>
                      </div>
                    ))}
                  </div> : <p className="table-empty">No paid orders in this period.</p>}
                </section>
                <section className="admin-panel health-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Business health</h2>
                      <p>{periodMode === "all" ? "All-time snapshot" : "Selected period snapshot"}</p>
                    </div>
                  </div>
                  <div className="health-row">
                    <span>Revenue</span>
                    <strong>{formatAdminPrice(sales)}</strong>
                  </div>
                  <div className="health-row">
                    <span>Product costs</span>
                    <strong>
                      {formatAdminPrice(productCost)}
                    </strong>
                  </div>
                  <div className="health-row">
                    <span>Operating expenses</span>
                    <strong>{formatAdminPrice(expensesTotal)}</strong>
                  </div>
                  <div className="health-row health-total">
                    <span>
                      {netProfit < 0
                        ? "Net loss"
                        : "Net profit"}
                    </span>
                    <strong
                      className={netProfit < 0 ? "loss-text" : "profit-text"}
                    >
                      {formatAdminPrice(Math.abs(netProfit))}
                    </strong>
                  </div>
                  <div className="health-row">
                    <span>Cancelled order value</span>
                    <strong>{formatAdminPrice(canceledLoss)}</strong>
                  </div>
                </section>
              </div>
              <section className="admin-panel recent-orders">
                <div className="panel-heading">
                  <div>
                    <h2>Recent orders</h2>
                    <p>Latest orders recorded by the store</p>
                  </div>
                  <button
                    className="admin-link-button"
                    onClick={() => setView("orders")}
                  >
                    View all <ArrowUpRight size={15} />
                  </button>
                </div>
                <OrdersTable
                  orders={periodOrders.slice(0, 4)}
                  onStatus={updateOrderStatus}
                  onOpen={setSelectedOrder}
                />
              </section>
              <section className="admin-panel low-stock-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Stock attention</h2>
                    <p>Raw materials and store supplies below their reorder levels</p>
                  </div>
                  <button
                    className="admin-link-button"
                    onClick={() => setView("stock")}
                  >
                    Manage stock <ArrowUpRight size={15} />
                  </button>
                </div>
                {lowInventory.length ? (
                  <div className="low-stock-list">
                    {lowInventory.map((item) => (
                      <div className="low-stock-row" key={item.id}>
                        <span className="stock-indicator">
                          <AlertTriangle size={15} />
                        </span>
                        <span className="table-primary">{item.name}</span>
                        <strong>{item.onHand} {item.unit} left</strong>
                        <span className="muted-small">SKU {item.sku}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="table-empty">
                    Raw materials and store supplies are above their reorder levels.
                  </p>
                )}
              </section>
            </section>
          )}

          {view === "orders" && (
            <section className="admin-view">
              <div className="admin-toolbar">
                <div className="toolbar-stat">
                  <strong>{periodOrders.length}</strong>
                  <span>orders in period</span>
                </div>
                <div className="admin-toolbar-actions"><button className="admin-secondary" type="button" onClick={() => { void loadAdminData().catch(() => setNotice("Could not refresh orders.")); }}><RefreshCw size={14} /> Refresh orders</button><button className="admin-primary" type="button" onClick={() => setManualOrder(true)}><Plus size={14} /> Create order</button></div>
              </div>
              <section className="admin-panel">
                <div className="panel-heading">
                  <div>
                    <h2>All orders</h2>
                    <p>
                      Click an order number to view customer and item details.
                    </p>
                  </div>
                  <span className="panel-period">
                    {filteredOrders.length} results
                  </span>
                </div>
                <OrdersTable
                  orders={[...filteredOrders].sort((a, b) =>
                    b.date.localeCompare(a.date),
                  )}
                  onStatus={updateOrderStatus}
                  onOpen={setSelectedOrder}
                />
              </section>
            </section>
          )}

          {view === "products" && (
            <section className="admin-view">
              <div className="admin-toolbar">
                <div className="toolbar-stat">
                  <strong>{data.products.length}</strong>
                  <span>
                    products ·{" "}
                    {
                      data.products.filter(
                        (product) => product.status === "Active",
                      ).length
                    }{" "}
                    active
                  </span>
                </div>
                <button
                  className="admin-primary"
                  onClick={() => setProductEditor(null)}
                >
                  <Plus size={16} />
                  Add product
                </button>
              </div>
              <section className="admin-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Product catalogue</h2>
                    <p>Manage prices, costs, finished-product stock and publishing status.</p>
                  </div>
                  <span className="panel-period">
                    {filteredProducts.length} results
                  </span>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Price</th>
                        <th>Cost</th>
                        <th>Unit margin</th>
                        <th>Finished stock</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <span className="table-primary">
                              {product.name}
                            </span>
                            <small>{product.category}</small>
                          </td>
                          <td>{product.sku}</td>
                          <td>{formatAdminPrice(product.price)}</td>
                          <td>{formatAdminPrice(product.cost)}</td>
                          <td>
                            <span
                              className={
                                product.price > product.cost
                                  ? "profit-text"
                                  : "loss-text"
                              }
                            >
                              {product.price
                                ? Math.round(
                                    ((product.price - product.cost) /
                                      product.price) *
                                      100,
                                  )
                                : 0}
                              %
                            </span>
                          </td>
                          <td>
                            <span
                              className={
                                product.stock <= data.settings.lowStockThreshold
                                  ? "stock-low"
                                  : "table-primary"
                              }
                            >
                              {product.stock}
                            </span>
                          </td>
                          <td>
                            <StatusTag value={product.status} />
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                className="icon-action"
                                title="Edit product"
                                aria-label={`Edit ${product.name}`}
                                onClick={() => setProductEditor(product)}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                className="icon-action danger-action"
                                title="Delete product"
                                aria-label={`Delete ${product.name}`}
                                onClick={() => void deleteProduct(product)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredProducts.length === 0 && (
                    <p className="table-empty">
                      No products match your search.
                    </p>
                  )}
                </div>
              </section>
            </section>
          )}

          {view === "stock" && (
            <section className="admin-view">
              <div className="admin-toolbar">
                <div className="toolbar-stat">
                  <strong>{lowInventory.length}</strong>
                  <span>raw materials or supplies need attention</span>
                </div>
                <button
                  className="admin-primary"
                  onClick={() => setInventoryEditor(null)}
                >
                  <Plus size={16} />
                  Add inventory item
                </button>
              </div>
              <section className="admin-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Raw materials & store stock</h2>
                    <p>
                      Finished-product stock is managed separately in Products.
                    </p>
                  </div>
                  <span className="panel-period">
                    {filteredInventory.length} items
                  </span>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Inventory item</th>
                        <th>Type</th>
                        <th>SKU</th>
                        <th>Unit</th>
                        <th>On hand</th>
                        <th>Reorder at</th>
                        <th>Cost / unit</th>
                        <th>Supplier</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((item) => (
                        <tr key={item.id}>
                          <td className="table-primary">{item.name}</td>
                          <td>{item.type}</td>
                          <td>{item.sku}</td>
                          <td>{item.unit}</td>
                          <td>
                            <div className="stock-adjust">
                              <button
                                aria-label={`Remove one ${item.name}`}
                                onClick={() =>
                                  setStock(
                                    item.id,
                                    Number((item.onHand - 1).toFixed(3)),
                                  )
                                }
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="0"
                                step="0.001"
                                aria-label={`Set ${item.name} quantity`}
                                value={item.onHand}
                                onChange={(event) =>
                                  setStock(item.id, Number(event.target.value))
                                }
                              />
                              <button
                                aria-label={`Add one ${item.name}`}
                                onClick={() =>
                                  setStock(
                                    item.id,
                                    Number((item.onHand + 1).toFixed(3)),
                                  )
                                }
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td>
                            {item.reorderLevel} {item.unit}
                          </td>
                          <td>{formatAdminPrice(item.costPerUnit)}</td>
                          <td>{item.supplier || "—"}</td>
                          <td>
                            <div className="row-actions">
                              <button
                                className="icon-action"
                                aria-label={`Edit ${item.name}`}
                                onClick={() => setInventoryEditor(item)}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                className="icon-action danger-action"
                                aria-label={`Delete ${item.name}`}
                                onClick={() =>
                                  void persist(
                                    (current) => ({
                                      ...current,
                                      inventory: current.inventory.filter(
                                        (entry) => entry.id !== item.id,
                                      ),
                                    }),
                                    `${item.name} removed`,
                                  )
                                }
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredInventory.length === 0 && (
                    <p className="table-empty">
                      No inventory items match your search.
                    </p>
                  )}
                </div>
              </section>
            </section>
          )}

          {view === "expenses" && (
            <section className="admin-view">
              <div className="metrics-grid metrics-two">
                <Metric
                  label="Recorded expenses"
                  value={formatAdminPrice(expensesTotal)}
                  note={periodMode === "all" ? "All recorded entries" : "Selected period"}
                  icon={Receipt}
                />
                <Metric
                  label="Expense entries"
                  value={String(periodExpenses.length)}
                  note="Recorded in this period"
                  icon={Wallet}
                />
              </div>
              <div className="admin-dashboard-grid expense-layout">
                <section className="admin-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Record an expense</h2>
                      <p>Track operating and fulfilment costs.</p>
                    </div>
                  </div>
                  <form className="expense-form" onSubmit={addExpense}>
                    <label>
                      Description
                      <input
                        name="title"
                        required
                        placeholder="e.g. Packaging supplies"
                      />
                    </label>
                    <div className="admin-form-grid">
                      <label>
                        Category
                        <select name="category">
                          <option>Operations</option>
                          <option>Packaging</option>
                          <option>Shipping</option>
                          <option>Marketing</option>
                          <option>Ingredients</option>
                          <option>Other</option>
                        </select>
                      </label>
                      <label>
                        Amount (₹)
                        <input
                          name="amount"
                          type="number"
                          min="1"
                          step="1"
                          required
                        />
                      </label>
                      <label>
                        Date
                        <input
                          name="date"
                          type="date"
                          defaultValue={today()}
                          required
                        />
                      </label>
                      <label>
                        Note
                        <input name="note" placeholder="Optional reference" />
                      </label>
                    </div>
                    <button className="admin-primary" type="submit">
                      <Plus size={16} />
                      Record expense
                    </button>
                  </form>
                </section>
                <section className="admin-panel expense-summary">
                  <div className="panel-heading">
                    <div>
                      <h2>Profit & loss</h2>
                      <p>Calculated from paid orders and recorded expenses.</p>
                    </div>
                  </div>
                  <div className="health-row">
                    <span>Paid sales</span>
                    <strong>{formatAdminPrice(sales)}</strong>
                  </div>
                  <div className="health-row">
                    <span>Cost of goods</span>
                    <strong>{formatAdminPrice(productCost)}</strong>
                  </div>
                  <div className="health-row">
                    <span>Gross profit</span>
                    <strong>{formatAdminPrice(grossProfit)}</strong>
                  </div>
                  <div className="health-row">
                    <span>Operating expenses</span>
                    <strong>{formatAdminPrice(expensesTotal)}</strong>
                  </div>
                  <div className="health-row health-total">
                    <span>{netProfit < 0 ? "Net loss" : "Net profit"}</span>
                    <strong
                      className={netProfit < 0 ? "loss-text" : "profit-text"}
                    >
                      {formatAdminPrice(Math.abs(netProfit))}
                    </strong>
                  </div>
                </section>
              </div>
              <section className="admin-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Expense ledger</h2>
                    <p>{periodExpenses.length} recorded entries</p>
                  </div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Date</th>
                        <th>Note</th>
                        <th>Amount</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {[...periodExpenses]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((expense) => (
                          <tr key={expense.id}>
                            <td className="table-primary">{expense.title}</td>
                            <td>{expense.category}</td>
                            <td>{expense.date}</td>
                            <td>{expense.note || "—"}</td>
                            <td className="table-primary">
                              {formatAdminPrice(expense.amount)}
                            </td>
                            <td>
                              <button
                                className="icon-action danger-action"
                                aria-label={`Delete ${expense.title}`}
                                onClick={() =>
                                  void persist((current) => ({
                                    ...current,
                                    expenses: current.expenses.filter(
                                      (item) => item.id !== expense.id,
                                    ),
                                  }), `${expense.title} removed`)
                                }
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
          )}

          {view === "customers" && (
            <section className="admin-view">
              <div className="metrics-grid metrics-three">
                <Metric
                  label="Customers"
                  value={String(customers.length)}
                  note="Unique customer records"
                  icon={Users}
                />
                <Metric
                  label="Repeat customers"
                  value={String(
                    customers.filter((customer) => customer.orders > 1).length,
                  )}
                  note="More than one order"
                  icon={TrendingUp}
                />
                <Metric
                  label="Customer sales"
                  value={formatAdminPrice(
                    customers.reduce(
                      (sum, customer) => sum + customer.spend,
                      0,
                    ),
                  )}
                  note="Paid order value"
                  icon={CircleDollarSign}
                />
              </div>
              <section className="admin-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Customer directory</h2>
                    <p>Customer records are derived from stored PostgreSQL orders.</p>
                  </div>
                  <span className="panel-period">
                    {customers.length} customers
                  </span>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Contact</th>
                        <th>Orders</th>
                        <th>Total spent</th>
                        <th>Last order</th>
                        <th>Segment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers
                        .sort((a, b) => b.spend - a.spend)
                        .map((customer) => (
                          <tr key={customer.email}>
                            <td className="table-primary">{customer.name}</td>
                            <td>
                              <span>{customer.email}</span>
                              <small>{customer.phone}</small>
                            </td>
                            <td>{customer.orders}</td>
                            <td className="table-primary">
                              {formatAdminPrice(customer.spend)}
                            </td>
                            <td>{customer.lastOrder}</td>
                            <td>
                              <StatusTag
                                value={
                                  customer.orders > 1
                                    ? "Repeat"
                                    : "New customer"
                                }
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {customers.length === 0 && (
                    <p className="table-empty">
                      No customers match your search.
                    </p>
                  )}
                </div>
              </section>
              <p className="preview-note">
                Customer entries are derived from orders recorded at checkout.
              </p>
            </section>
          )}

          {view === "settings" && (
            <section className="admin-view settings-layout">
              <form
                className="admin-panel settings-form"
                onSubmit={saveSettings}
              >
                <div className="panel-heading">
                  <div>
                    <h2>Store profile</h2>
                    <p>Contact details, stock alerts, and store configuration.</p>
                  </div>
                  <button className="admin-primary" type="submit">
                    <Check size={15} />
                    Save settings
                  </button>
                </div>
                <div className="admin-form-grid">
                  <label>
                    Store name
                    <input
                      name="storeName"
                      defaultValue={data.settings.storeName}
                      required
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      name="phone"
                      type="tel"
                      defaultValue={data.settings.phone}
                      required
                    />
                  </label>
                  <label className="form-wide">
                    Business address
                    <textarea
                      name="address"
                      rows={3}
                      defaultValue={data.settings.address}
                      required
                    />
                  </label>
                  <label>
                    Low-stock alert threshold
                    <input
                      name="lowStockThreshold"
                      type="number"
                      min="0"
                      defaultValue={data.settings.lowStockThreshold}
                      required
                    />
                  </label>
                  <label>
                    Tax rate (%)
                    <input
                      name="taxRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      defaultValue={data.settings.taxRate}
                    />
                  </label>
                  <label>
                    Store currency
                    <input value="Indian Rupee (INR)" readOnly />
                  </label>
                </div>
                <p className="settings-footnote">
                  These settings are stored in PostgreSQL. The current checkout does not apply tax.
                </p>
              </form>
              <div className="admin-view"><AdminUsers /><WhatsAppSettings /><PaymentQrSettings /></div>
            </section>
          )}
        </div>
      </section>
      {mobileSidebar && (
        <button
          className="admin-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileSidebar(false)}
        />
      )}
      {manualOrder && <ManualOrderEditor products={data.products} onClose={() => setManualOrder(false)} onCreated={async (orderNumber) => { await loadAdminData(); setManualOrder(false); setNotice(`${orderNumber} created.`); }} />}
      {productEditor !== undefined && (
        <ProductEditor
          key={productEditor?.id || "new-product"}
          product={productEditor}
          onClose={() => setProductEditor(undefined)}
          onSave={saveProduct}
        />
      )}
      {inventoryEditor !== undefined && (
        <InventoryEditor
          key={inventoryEditor?.id || "new-inventory-item"}
          item={inventoryEditor}
          onClose={() => setInventoryEditor(undefined)}
          onSave={saveInventory}
        />
      )}
      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatus={updateOrderStatus}
          onPayment={(orderId, payment) => { void updateOrder(orderId, { payment }); }}
        />
      )}
    </main>
  );
}

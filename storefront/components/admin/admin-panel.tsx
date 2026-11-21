"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pencil,
  Plus,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "@/components/site-shell";
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

const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (date: string) => date.slice(0, 7);
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
  onLogin: (email: string, password: string) => Promise<string | null>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await onLogin(email, password);
    setError(result || "");
    setBusy(false);
  }
  return (
    <main className="admin-login-page">
      <section className="admin-login">
        <Logo />
        <p className="admin-kicker">STORE MANAGEMENT</p>
        <h1>Welcome back</h1>
        <p className="admin-login-copy">
          Sign in to your Yaakai admin workspace.
        </p>
        <form onSubmit={submit}>
          <label>
            Email address
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@yaakai.in"
            />
          </label>
          <label>
            Password
            <span className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
              />
              <button
                type="button"
                className="text-action"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>
          {error && (
            <p className="admin-login-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="admin-primary login-submit"
            type="submit"
            disabled={busy}
          >
            {busy ? "Signing in…" : "Sign in"}{" "}
            {!busy && <ArrowUpRight size={16} />}
          </button>
        </form>
        <div className="preview-notice">
          <AlertTriangle size={16} />
          <span>
            Sign-in uses server credentials. Configure the admin environment
            variables and PostgreSQL connection before use.
          </span>
        </div>
      </section>
      <span className="admin-login-foot">YAAKAI · STORE OPERATIONS</span>
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
                  {order.id}
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
                  aria-label={`Update status for ${order.id}`}
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
  onSave: (draft: ProductDraft) => void;
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
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            onSave({
              id: product?.id,
              name: String(fields.get("name")),
              category: String(fields.get("category")),
              sku: String(fields.get("sku")),
              price: Number(fields.get("price")),
              cost: Number(fields.get("cost")),
              stock: Number(fields.get("stock")),
              status: String(fields.get("status")) as AdminProduct["status"],
            });
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
              Selling price
              <input
                name="price"
                type="number"
                min="0"
                step="1"
                defaultValue={product?.price}
                required
              />
            </label>
            <label>
              Unit cost
              <input
                name="cost"
                type="number"
                min="0"
                step="1"
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
          </div>
          <div className="modal-actions">
            <button type="button" className="admin-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="admin-primary">
              <Check size={15} /> Save product
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

function OrderDetails({
  order,
  onClose,
  onStatus,
}: {
  order: AdminOrder;
  onClose: () => void;
  onStatus: (orderId: string, status: OrderStatus) => void;
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
            <h2 id="order-detail-title">{order.id}</h2>
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
        <p className="preview-note">
          Demo order only. Shipping, payment, and customer notifications are not
          connected.
        </p>
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
  const [query, setQuery] = useState("");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [productEditor, setProductEditor] = useState<
    AdminProduct | null | undefined
  >(undefined);
  const [inventoryEditor, setInventoryEditor] = useState<
    InventoryItem | null | undefined
  >(undefined);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
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

  async function login(email: string, password: string) {
    let response: Response;
    try {
      response = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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

  const currentMonth = new Date().toISOString().slice(0, 7);
  const previousMonthDate = new Date();
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonth = previousMonthDate.toISOString().slice(0, 7);
  const paidOrders = data.orders.filter(
    (order) => order.payment === "Paid" && order.status !== "Cancelled",
  );
  const sales = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const productCost = paidOrders.reduce((sum, order) => sum + order.cost, 0);
  const grossProfit = sales - productCost;
  const expensesTotal = data.expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const netProfit = grossProfit - expensesTotal;
  const currentSales = paidOrders
    .filter((order) => monthKey(order.date) === currentMonth)
    .reduce((sum, order) => sum + order.total, 0);
  const previousSales = paidOrders
    .filter((order) => monthKey(order.date) === previousMonth)
    .reduce((sum, order) => sum + order.total, 0);
  const growth =
    previousSales === 0
      ? 0
      : Math.round(((currentSales - previousSales) / previousSales) * 100);
  const margin = sales === 0 ? 0 : Math.round((grossProfit / sales) * 100);
  const lowStock = data.products.filter(
    (product) => product.stock <= data.settings.lowStockThreshold,
  );
  const lowInventory = data.inventory.filter(
    (item) => item.onHand <= item.reorderLevel,
  );
  const monthExpenses = data.expenses
    .filter((expense) => monthKey(expense.date) === currentMonth)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const canceledLoss = data.orders
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
    const saved = await persist(
      (current) => ({
        ...current,
        orders: current.orders.map((order) =>
          order.id === orderId ? { ...order, status } : order,
        ),
      }),
      `${orderId} updated`,
    );
    if (saved)
      setSelectedOrder((current) =>
        current?.id === orderId ? { ...current, status } : current,
      );
  }

  async function saveProduct(draft: ProductDraft) {
    const id = draft.id || `yaakai-${Date.now()}`;
    const saved = await persist(
      (current) => ({
        ...current,
        products: draft.id
          ? current.products.map((product) =>
              product.id === draft.id ? { ...draft, id } : product,
            )
          : [{ ...draft, id }, ...current.products],
      }),
      draft.id ? "Product changes saved." : "Product added to catalogue.",
    );
    if (saved) setProductEditor(undefined);
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

  const filteredOrders = data.orders.filter((order) =>
    `${order.id} ${order.customer} ${order.email} ${order.status}`
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
  const monthSeries = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const key = date.toISOString().slice(0, 7);
    return {
      label: date.toLocaleDateString("en-IN", { month: "short" }),
      total: paidOrders
        .filter((order) => monthKey(order.date) === key)
        .reduce((sum, order) => sum + order.total, 0),
    };
  });
  const maximumMonth = Math.max(...monthSeries.map((month) => month.total), 1);

  const customers = Object.values(
    data.orders.reduce<
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
      const current = result[order.email] || {
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
      result[order.email] = current;
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
          <div className="admin-preview-chip">
            <span className={dataError ? "connection-offline" : ""} />
            {dataError ? "DATABASE OFFLINE" : ready ? "POSTGRESQL" : "CONNECTING"}
          </div>
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
                <div className={`admin-demo-banner${dataError ? " is-error" : ""}`}>
                  <AlertTriangle size={17} />
                  <span>
                    <strong>{dataError ? "Database unavailable" : "PostgreSQL connected"}</strong>
                    {dataError ? ` · ${dataError}` : " · Admin changes are saved transactionally. Customer orders appear after checkout is connected."}
                  </span>
                </div>
              <div className="metrics-grid">
                <Metric
                  label="Gross sales"
                  value={formatAdminPrice(sales)}
                  note="Paid orders · all time"
                  icon={CircleDollarSign}
                  trend={`${growth >= 0 ? "+" : ""}${growth}% this month`}
                  negative={growth < 0}
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
                  note={`${formatAdminPrice(monthExpenses)} expenses this month`}
                  icon={netProfit < 0 ? TrendingDown : Wallet}
                  negative={netProfit < 0}
                />
                <Metric
                  label="Open orders"
                  value={String(
                    data.orders.filter(
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
                      <p>Paid order revenue by month</p>
                    </div>
                    <span className="panel-period">
                      Last 6 months <ChevronDown size={14} />
                    </span>
                  </div>
                  <div
                    className="revenue-chart"
                    aria-label="Monthly revenue chart"
                  >
                    {monthSeries.map((month) => (
                      <div
                        className="chart-column"
                        key={`${month.label}-${month.total}`}
                      >
                        <span className="chart-value">
                          {month.total
                            ? `${Math.round(month.total / 100) / 10}k`
                            : "—"}
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
                  </div>
                </section>
                <section className="admin-panel health-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Business health</h2>
                      <p>Current month snapshot</p>
                    </div>
                  </div>
                  <div className="health-row">
                    <span>Revenue</span>
                    <strong>{formatAdminPrice(currentSales)}</strong>
                  </div>
                  <div className="health-row">
                    <span>Product costs</span>
                    <strong>
                      {formatAdminPrice(
                        paidOrders
                          .filter(
                            (order) => monthKey(order.date) === currentMonth,
                          )
                          .reduce((sum, order) => sum + order.cost, 0),
                      )}
                    </strong>
                  </div>
                  <div className="health-row">
                    <span>Operating expenses</span>
                    <strong>{formatAdminPrice(monthExpenses)}</strong>
                  </div>
                  <div className="health-row health-total">
                    <span>
                      {netProfit < 0
                        ? "Net loss · all time"
                        : "Net profit · all time"}
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
                  orders={data.orders.slice(0, 4)}
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
                  <strong>{data.orders.length}</strong>
                  <span>orders in PostgreSQL</span>
                </div>
                <div className="toolbar-note">
                  Update fulfilment status directly from the order list.
                </div>
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
                                onClick={() => {
                                  void persist((current) => ({
                                    ...current,
                                    products: current.products.filter(
                                      (item) => item.id !== product.id,
                                    ),
                                  }), `${product.name} removed from catalogue.`);
                                }}
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
                  note="All entries in this preview"
                  icon={Receipt}
                />
                <Metric
                  label="This month"
                  value={formatAdminPrice(monthExpenses)}
                  note="Current month expenses"
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
                    <p>{data.expenses.length} recorded entries</p>
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
                      {[...data.expenses]
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
                                  updateAdminData((current) => ({
                                    ...current,
                                    expenses: current.expenses.filter(
                                      (item) => item.id !== expense.id,
                                    ),
                                  }))
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
                    <p>Customer details are derived from preview orders.</p>
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
                Customer management uses sample order details until a secure
                order database is connected.
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
                    <p>
                      Contact details and inventory controls for the preview
                      store.
                    </p>
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
                  These settings save to this browser only in preview mode. Tax
                  is not applied to checkout.
                </p>
              </form>
              <section className="admin-panel settings-security">
                <div className="panel-heading">
                  <div>
                    <h2>Access & data</h2>
                    <p>Preview configuration</p>
                  </div>
                </div>
                <div className="security-note">
                  <AlertTriangle size={18} />
                  <p>
                    <strong>Demo authentication</strong>
                    <br />
                    The login screen is a UI gate, not server-side security. Do
                    not enter real customer information until authentication and
                    database storage are connected.
                  </p>
                </div>
                <button
                  className="admin-secondary"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Reset products, orders, stock, expenses, and settings to sample data?",
                      )
                    ) {
                      updateAdminData(() => initialAdminData);
                      setNotice("Preview data reset to sample values.");
                    }
                  }}
                >
                  Reset preview data
                </button>
              </section>
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
      {productEditor !== undefined && (
        <ProductEditor
          key={productEditor?.id || "new-product"}
          product={productEditor}
          onClose={() => setProductEditor(undefined)}
          onSave={saveProduct}
        />
      )}
      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatus={updateOrderStatus}
        />
      )}
    </main>
  );
}

export type AdminProduct = {
  id: string;
  name: string;
  category: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  status: "Active" | "Draft";
};

export type OrderStatus = "New" | "Processing" | "Packed" | "Shipped" | "Delivered" | "Cancelled";
export type AdminOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  phone: string;
  deliveryAddress?: { address: string; address2: string; city: string; state: string; postalCode: string; country: string };
  date: string;
  items: string[];
  total: number;
  cost: number;
  status: OrderStatus;
  payment: "Paid" | "Awaiting payment" | "Refunded";
};

export type Expense = { id: string; title: string; category: string; amount: number; date: string; note: string };
export type InventoryItem = { id: string; name: string; sku: string; type: "Raw material" | "Store stock"; unit: string; onHand: number; reorderLevel: number; costPerUnit: number; supplier: string };
export type StoreSettings = { storeName: string; address: string; phone: string; lowStockThreshold: number; taxRate: number; currency: "INR" };
export type AdminData = { products: AdminProduct[]; orders: AdminOrder[]; inventory: InventoryItem[]; expenses: Expense[]; settings: StoreSettings };

export const emptyAdminData: AdminData = {
  products: [], orders: [], inventory: [], expenses: [],
  settings: { storeName: "Yaakai", address: "", phone: "", lowStockThreshold: 8, taxRate: 0, currency: "INR" },
};

export const orderStatuses: OrderStatus[] = ["New", "Processing", "Packed", "Shipped", "Delivered", "Cancelled"];
export const formatAdminPrice = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
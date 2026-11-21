import { products } from "@/lib/products";

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
  customer: string;
  email: string;
  phone: string;
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

const productCosts: Record<string, number> = {
  "curry-leaf-thokku": 112,
  "honey-nuts": 205,
  "health-mix-powder": 148,
  "immunity-mix": 120,
  "traditional-masala-powders": 74,
};

export const initialAdminData: AdminData = {
  products: products.map((product, index) => ({
    id: product.slug,
    name: product.name,
    category: product.category,
    sku: `YAA-${String(index + 1).padStart(3, "0")}`,
    price: product.variants[0].price,
    cost: productCosts[product.slug] || Math.round(product.variants[0].price * 0.42),
    stock: 0,
    status: "Active",
  })),
  orders: [],
  inventory: [
    { id: "raw-curry-leaves", name: "Fresh curry leaves", sku: "RAW-001", type: "Raw material", unit: "kg", onHand: 12, reorderLevel: 4, costPerUnit: 240, supplier: "Karaikal market" },
    { id: "raw-groundnuts", name: "Groundnuts", sku: "RAW-002", type: "Raw material", unit: "kg", onHand: 6, reorderLevel: 8, costPerUnit: 180, supplier: "Local farm co-op" },
    { id: "raw-sesame-oil", name: "Cold-pressed sesame oil", sku: "RAW-003", type: "Raw material", unit: "L", onHand: 9, reorderLevel: 3, costPerUnit: 290, supplier: "Karaikal oil mill" },
    { id: "raw-millet-blend", name: "Health mix grains", sku: "RAW-004", type: "Raw material", unit: "kg", onHand: 22, reorderLevel: 6, costPerUnit: 155, supplier: "Puducherry grains" },
    { id: "raw-turmeric", name: "Turmeric powder", sku: "RAW-005", type: "Raw material", unit: "kg", onHand: 3, reorderLevel: 5, costPerUnit: 210, supplier: "Local spice supplier" },
    { id: "store-jars", name: "Glass jars", sku: "SUP-001", type: "Store stock", unit: "pcs", onHand: 40, reorderLevel: 20, costPerUnit: 18, supplier: "Packaging vendor" },
    { id: "store-pouches", name: "Stand-up pouches", sku: "SUP-002", type: "Store stock", unit: "pcs", onHand: 120, reorderLevel: 50, costPerUnit: 6, supplier: "Packaging vendor" },
  ],
  expenses: [],
  settings: {
    storeName: "Yaakai",
    address: "226, Gandhi Road, T.R.Pattinam,\nKaraikal, Puducherry. 609606.",
    phone: "+91 8098874435",
    lowStockThreshold: 8,
    taxRate: 0,
    currency: "INR",
  },
};

export const emptyAdminData: AdminData = {
  products: [], orders: [], inventory: [], expenses: [],
  settings: { storeName: "Yaakai", address: "", phone: "", lowStockThreshold: 8, taxRate: 0, currency: "INR" },
};

export const orderStatuses: OrderStatus[] = ["New", "Processing", "Packed", "Shipped", "Delivered", "Cancelled"];
export const formatAdminPrice = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
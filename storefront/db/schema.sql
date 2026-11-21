CREATE TABLE IF NOT EXISTS admin_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  finished_stock INTEGER NOT NULL DEFAULT 0 CHECK (finished_stock >= 0),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Draft')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  ordered_on DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New','Processing','Packed','Shipped','Delivered','Cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'Awaiting payment' CHECK (payment_status IN ('Paid','Awaiting payment','Refunded')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_orders_ordered_on_idx ON admin_orders (ordered_on DESC);
CREATE INDEX IF NOT EXISTS admin_orders_customer_email_idx ON admin_orders (email);

CREATE TABLE IF NOT EXISTS admin_inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  item_type TEXT NOT NULL CHECK (item_type IN ('Raw material','Store stock')),
  unit TEXT NOT NULL,
  on_hand NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reorder_level NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  cost_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0),
  supplier TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_expenses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  spent_on DATE NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  low_stock_threshold INTEGER NOT NULL DEFAULT 8 CHECK (low_stock_threshold >= 0),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
  currency TEXT NOT NULL DEFAULT 'INR'
);
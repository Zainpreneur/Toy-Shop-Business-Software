export type Role = "ADMIN" | "MANAGER" | "STAFF";
export type OrderStatus = "PENDING" | "PAID" | "REFUNDED" | "CANCELLED";
export type PaymentMethod = "CASH" | "CARD" | "ONLINE" | "OTHER";
export type StockMovementType = "RESTOCK" | "SALE" | "ADJUSTMENT" | "RETURN";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Category {
  id: number;
  name: string;
  _count?: { products: number };
}

export interface Supplier {
  id: number;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
  _count?: { products: number };
  products?: Product[];
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  ageRange?: string | null;
  costPrice: number;
  price: number;
  stockQty: number;
  reorderLevel: number;
  imageUrl?: string | null;
  active: boolean;
  categoryId?: number | null;
  category?: Category | null;
  supplierId?: number | null;
  supplier?: Supplier | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  _count?: { orders: number };
  orders?: Order[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  product: Product;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerId?: number | null;
  customer?: Customer | null;
  userId?: number | null;
  user?: { id: number; name: string } | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string | null;
  createdAt: string;
  items: OrderItem[];
}

export interface EmployeeUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  productCount: number;
  customerCount: number;
  supplierCount: number;
  totalRevenue: number;
  totalOrders: number;
  todaysRevenue: number;
  todaysOrderCount: number;
  lowStockCount: number;
}

export interface SalesTrendPoint {
  date: string;
  revenue: number;
}

export interface TopProduct {
  product: Product;
  totalSold: number;
  totalRevenue: number;
}

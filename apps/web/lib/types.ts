export type RoleName = 'Admin' | 'Sales';

export type User = {
  id: string;
  name: string;
  email: string;
  role: RoleName | string;
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Customer = {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  gstNumber?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  _count?: { leads: number; quotations: number; salesOrders: number };
  leads?: Lead[];
  quotations?: Quotation[];
  salesOrders?: SalesOrder[];
};

export type Lead = {
  id: string;
  customerId?: string | null;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  source: string;
  requirement: string;
  quantity?: number | null;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'QUOTATION' | 'WON' | 'LOST';
  assignedUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer | null;
  assignedUser?: User | null;
  quotations?: Quotation[];
  _count?: { quotations: number };
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  fabric: string;
  price: string | number;
  moq: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QuotationItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string | number;
  taxRate: string | number;
  lineTotal: string | number;
  product?: Product;
};

export type Quotation = {
  id: string;
  quotationNumber: string;
  customerId: string;
  leadId?: string | null;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
  subtotal: string | number;
  tax: string | number;
  total: string | number;
  validUntil?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  lead?: Lead | null;
  items: QuotationItem[];
  salesOrder?: { id: string; orderNumber: string; status: string } | null;
};

export type SalesOrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string | number;
  taxRate: string | number;
  lineTotal: string | number;
  product?: Product;
};

export type SalesOrder = {
  id: string;
  orderNumber: string;
  customerId: string;
  quotationId?: string | null;
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  subtotal: string | number;
  tax: string | number;
  total: string | number;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  quotation?: { id: string; quotationNumber: string; status: string; lead?: Lead | null } | null;
  items: SalesOrderItem[];
};

export type DashboardSummary = {
  leads: number;
  customers: number;
  activeQuotations: number;
  confirmedSalesOrders: number;
  productCount: number;
  pipeline: Record<string, number>;
};

export type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
  user: { name: string; email: string };
};

export const moneyNumber = (value: string | number | null | undefined): number => {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const formatMoney = (value: string | number | null | undefined): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(moneyNumber(value));

export const formatDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';

export const labelize = (value: string): string => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

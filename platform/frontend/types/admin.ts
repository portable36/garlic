export interface User {
  id: string
  email: string
  role_id: number
  role_name?: string
  is_banned: boolean
  ban_reason?: string
  created_at: string
}

export interface Permission {
  id: number
  name: string
  description: string
  created_at: string
}

export interface Role {
  id: number
  name: string
  description?: string
  permissions: Permission[]
  created_at: string
}

export interface Setting {
  id: number
  setting_key: string
  setting_value: string
  setting_type: string
  setting_group: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: number
  user_id: string | null
  user_email?: string
  action: string
  entity_type: string
  entity_id: string
  details: string
  ip_address: string
  user_agent: string
  created_at: string
}

export interface Vendor {
  id: string
  user_id: string
  user_email?: string
  store_name: string
  description: string
  logo_url: string
  status: "pending" | "approved" | "rejected"
  approved_at: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  product_id: string
  product_name?: string
  user_id: string
  user_email?: string
  rating: number
  comment: string
  status: "pending" | "approved" | "rejected"
  created_at: string
}

export interface OrderSummary {
  id: string
  user_email: string
  total_amount: number
  status: string
  created_at: string
}

export interface DailySales {
  date: string
  amount: number
}

export interface Analytics {
  total_users: number
  total_orders: number
  total_revenue: number
  total_products: number
  pending_orders: number
  completed_orders: number
  recent_orders: OrderSummary[]
  sales_by_day: DailySales[]
}

export interface AdminUser {
  id: string
  email: string
  role_id: number
  is_banned: boolean
  ban_reason: string
  permissions: Permission[]
}

export const PERMISSIONS = {
  MANAGE_USERS: "manage_users",
  MANAGE_PRODUCTS: "manage_products",
  MANAGE_ORDERS: "manage_orders",
  MANAGE_INVENTORY: "manage_inventory",
  MANAGE_VENDORS: "manage_vendors",
  MANAGE_PAYMENTS: "manage_payments",
  MANAGE_SHIPPING: "manage_shipping",
  MANAGE_REVIEWS: "manage_reviews",
  MANAGE_SETTINGS: "manage_settings",
  VIEW_ANALYTICS: "view_analytics",
  MANAGE_ROLES: "manage_roles",
} as const

export const PERMISSION_LABELS: Record<string, string> = {
  manage_users: "Manage Users",
  manage_products: "Manage Products",
  manage_orders: "Manage Orders",
  manage_inventory: "Manage Inventory",
  manage_vendors: "Manage Vendors",
  manage_payments: "Manage Payments",
  manage_shipping: "Manage Shipping",
  manage_reviews: "Manage Reviews",
  manage_settings: "Manage Settings",
  view_analytics: "View Analytics",
  manage_roles: "Manage Roles",
}

export const ROLE_LABELS: Record<number, string> = {
  1: "Super Admin",
  2: "Admin",
  3: "Vendor",
  4: "Support",
}

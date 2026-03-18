import axios from "axios"
import Cookies from "js-cookie"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost"

const api = axios.create({
  baseURL: `${API_URL}`,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove("access_token")
      Cookies.remove("refresh_token")
      window.location.href = "/auth/login"
    }
    return Promise.reject(error)
  }
)

export const adminAPI = {
  // Auth
  validate: () => api.get("/admin/validate"),

  // Users
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get("/admin/users", { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  assignRole: (id: string, role_id: number) =>
    api.put(`/admin/users/${id}/role`, { role_id }),
  banUser: (id: string, reason: string) =>
    api.put(`/admin/users/${id}/ban`, { reason }),
  unbanUser: (id: string) => api.put(`/admin/users/${id}/unban`),

  // Roles
  getRoles: () => api.get("/admin/roles"),
  getRole: (id: number) => api.get(`/admin/roles/${id}`),
  createRole: (data: { name: string; description?: string }) =>
    api.post("/admin/roles", data),
  updateRolePermissions: (id: number, permissions: number[]) =>
    api.put(`/admin/roles/${id}/permissions`, { permissions }),
  deleteRole: (id: number) => api.delete(`/admin/roles/${id}`),

  // Permissions
  getPermissions: () => api.get("/admin/permissions"),

  // Settings
  getSettings: (group?: string) =>
    api.get("/admin/settings", { params: { group } }),
  getSetting: (key: string) => api.get(`/admin/settings/${key}`),
  updateSetting: (key: string, value: string, type?: string) =>
    api.put("/admin/settings", { key, value, type }),
  updateSettings: (settings: Record<string, string>) =>
    api.put("/admin/settings/batch", { settings }),

  // Analytics
  getAnalytics: (period?: number) =>
    api.get("/admin/analytics", { params: { period } }),

  // Audit Logs
  getAuditLogs: (params?: {
    page?: number
    limit?: number
    user_id?: string
    action?: string
  }) => api.get("/admin/audit-logs", { params }),

  // Vendors
  getVendors: (status?: string) =>
    api.get("/admin/vendors", { params: { status } }),
  approveVendor: (id: string) => api.put(`/admin/vendors/${id}/approve`),
  rejectVendor: (id: string) => api.put(`/admin/vendors/${id}/reject`),

  // Reviews
  getReviews: (status?: string) =>
    api.get("/admin/reviews", { params: { status } }),
  approveReview: (id: string) => api.put(`/admin/reviews/${id}/approve`),
  rejectReview: (id: string) => api.put(`/admin/reviews/${id}/reject`),
}

export default api

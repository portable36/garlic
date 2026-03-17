import axios from "axios"
import Cookies from "js-cookie"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const api = axios.create({
  baseURL: `${API_URL}/admin`,
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
  validate: () => api.get("/validate"),

  // Users
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get("/users", { params }),
  getUser: (id: string) => api.get(`/users/${id}`),
  assignRole: (id: string, role_id: number) =>
    api.put(`/users/${id}/role`, { role_id }),
  banUser: (id: string, reason: string) =>
    api.put(`/users/${id}/ban`, { reason }),
  unbanUser: (id: string) => api.put(`/users/${id}/unban`),

  // Roles
  getRoles: () => api.get("/roles"),
  getRole: (id: number) => api.get(`/roles/${id}`),
  createRole: (data: { name: string; description?: string }) =>
    api.post("/roles", data),
  updateRolePermissions: (id: number, permissions: number[]) =>
    api.put(`/roles/${id}/permissions`, { permissions }),
  deleteRole: (id: number) => api.delete(`/roles/${id}`),

  // Permissions
  getPermissions: () => api.get("/permissions"),

  // Settings
  getSettings: (group?: string) =>
    api.get("/settings", { params: { group } }),
  getSetting: (key: string) => api.get(`/settings/${key}`),
  updateSetting: (key: string, value: string, type?: string) =>
    api.put("/settings", { key, value, type }),
  updateSettings: (settings: Record<string, string>) =>
    api.put("/settings/batch", { settings }),

  // Analytics
  getAnalytics: (period?: number) =>
    api.get("/analytics", { params: { period } }),

  // Audit Logs
  getAuditLogs: (params?: {
    page?: number
    limit?: number
    user_id?: string
    action?: string
  }) => api.get("/audit-logs", { params }),

  // Vendors
  getVendors: (status?: string) =>
    api.get("/vendors", { params: { status } }),
  approveVendor: (id: string) => api.put(`/vendors/${id}/approve`),
  rejectVendor: (id: string) => api.put(`/vendors/${id}/reject`),

  // Reviews
  getReviews: (status?: string) =>
    api.get("/reviews", { params: { status } }),
  approveReview: (id: string) => api.put(`/reviews/${id}/approve`),
  rejectReview: (id: string) => api.put(`/reviews/${id}/reject`),
}

export default api

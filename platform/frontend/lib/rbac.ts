"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Cookies from "js-cookie"
import { adminAPI } from "@/lib/admin-api"
import type { Permission, AdminUser } from "@/types/admin"
import { PERMISSIONS } from "@/types/admin"

interface UseAuthReturn {
  user: AdminUser | null
  isLoading: boolean
  isAuthenticated: boolean
  refetch: () => Promise<void>
}

interface UsePermissionReturn {
  hasPermission: (permission: string) => boolean
  isLoading: boolean
}

const permissionCache = new Map<string, string[]>()

export function useAdminAuth(): UseAuthReturn {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchUser = useCallback(async () => {
    const token = Cookies.get("access_token")
    if (!token) {
      setIsLoading(false)
      router.push("/auth/login")
      return
    }

    try {
      const response = await adminAPI.validate()
      const userData = response.data.user
      const permissions = response.data.permissions || []

      const adminUser: AdminUser = {
        id: userData.id,
        email: userData.email,
        role_id: userData.role_id,
        is_banned: userData.is_banned,
        ban_reason: userData.ban_reason,
        permissions: permissions,
      }

      setUser(adminUser)
      permissionCache.set(adminUser.id, permissions.map((p: Permission) => p.name))
    } catch (error) {
      Cookies.remove("access_token")
      Cookies.remove("refresh_token")
      router.push("/auth/login")
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !user.is_banned,
    refetch: fetchUser,
  }
}

export function useHasPermission(): UsePermissionReturn {
  const { user, isLoading } = useAdminAuth()

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false
      if (user.role_id === 1) return true

      const permissions = permissionCache.get(user.id)
      if (!permissions) return false

      return permissions.includes(permission)
    },
    [user]
  )

  return { hasPermission, isLoading }
}

export function useRequirePermission(permission: string) {
  const { hasPermission, isLoading } = useHasPermission()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !hasPermission(permission)) {
      router.push(`/admin/unauthorized?redirect=${pathname}`)
    }
  }, [isLoading, hasPermission, permission, router, pathname])

  return hasPermission(permission)
}

export function useRequireAdmin() {
  const { user, isLoading } = useAdminAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push(`/auth/login?redirect=${pathname}`)
      } else if (user.role_id > 2) {
        router.push(`/admin/unauthorized?redirect=${pathname}`)
      }
    }
  }, [isLoading, user, router, pathname])

  return user
}

export const adminPermissions = {
  canManageUsers: () => useHasPermission().hasPermission(PERMISSIONS.MANAGE_USERS),
  canManageProducts: () => useHasPermission().hasPermission(PERMISSIONS.MANAGE_PRODUCTS),
  canManageOrders: () => useHasPermission().hasPermission(PERMISSIONS.MANAGE_ORDERS),
  canManageInventory: () => useHasPermission().hasPermission(PERMISSIONS.MANAGE_INVENTORY),
  canManageVendors: () => useHasPermission().hasPermission(PERMISSIONS.MANAGE_VENDORS),
  canManagePayments: () => useHasPermission().hasPermission(PERMISSIONS.MANAGE_PAYMENTS),
  canManageShipping: () => useHasPermission().hasPermission(PERMISSIONS.MANAGE_SHIPPING),
  canManageReviews: () => useHasPermission().hasPermission(PERMISSIONS.MANAGE_REVIEWS),
  canManageSettings: () => useHasPermission().hasPermission(PERMISSIONS.MANAGE_SETTINGS),
  canViewAnalytics: () => useHasPermission().hasPermission(PERMISSIONS.VIEW_ANALYTICS),
  canManageRoles: () => useHasPermission().hasPermission(PERMISSIONS.MANAGE_ROLES),
}

export const roleGuard = {
  isSuperAdmin: (roleId: number) => roleId === 1,
  isAdmin: (roleId: number) => roleId === 1 || roleId === 2,
  isVendor: (roleId: number) => roleId === 3,
  isSupport: (roleId: number) => roleId === 4,
}

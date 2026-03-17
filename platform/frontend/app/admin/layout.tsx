"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { Sidebar } from "@/components/Layout/Sidebar"
import { Header } from "@/components/Layout/Header"
import type { AdminUser } from "@/types/admin"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    const token = Cookies.get("access_token")
    const roleId = Cookies.get("role_id")
    
    if (!token) {
      router.push("/auth/login")
      return
    }

    // role_id 1 = admin, 3 = super_admin - allow access
    const isAdmin = roleId === "1" || roleId === "3" || roleId === "4"
    if (!isAdmin) {
      router.push("/")
      return
    }

    setUser({
      id: "1",
      email: "admin@garlic.test",
      role_id: parseInt(roleId),
      is_banned: false,
      ban_reason: "",
      permissions: [],
    })
    setIsLoading(false)
  }, [router])

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}

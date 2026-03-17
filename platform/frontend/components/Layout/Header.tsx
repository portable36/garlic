"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { getInitials } from "@/lib/utils"
import type { AdminUser } from "@/types/admin"
import { ROLE_LABELS } from "@/types/admin"

interface HeaderProps {
  user: AdminUser
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleLogout = () => {
    Cookies.remove("access_token")
    Cookies.remove("refresh_token")
    router.push("/auth/login")
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-gray-900">
          {ROLE_LABELS[user.role_id] || "Admin"}
        </h2>
      </div>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 rounded-full bg-gray-100 px-3 py-2 hover:bg-gray-200"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
            {getInitials(user.email)}
          </div>
          <span className="text-sm font-medium">{user.email}</span>
        </button>
        
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-md border bg-white py-1 shadow-lg">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">{user.email}</p>
                <p className="text-xs text-gray-500">{ROLE_LABELS[user.role_id]}</p>
              </div>
              <button
                onClick={() => { router.push("/"); setShowDropdown(false); }}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                View Store
              </button>
              <button
                onClick={() => { router.push("/admin/settings"); setShowDropdown(false); }}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
              >
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

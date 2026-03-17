"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: "📊" },
  { name: "Users", href: "/admin/users", icon: "👥" },
  { name: "Products", href: "/admin/products", icon: "📦" },
  { name: "Orders", href: "/admin/orders", icon: "🛒" },
  { name: "Inventory", href: "/admin/inventory", icon: "📋" },
  { name: "Vendors", href: "/admin/vendors", icon: "🏪" },
  { name: "Payments", href: "/admin/payments", icon: "💳" },
  { name: "Shipping", href: "/admin/shipping", icon: "🚚" },
  { name: "Reviews", href: "/admin/reviews", icon: "⭐" },
  { name: "Analytics", href: "/admin/analytics", icon: "📈" },
  { name: "Roles", href: "/admin/roles-permissions", icon: "🔐" },
  { name: "Settings", href: "/admin/settings", icon: "⚙️" },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={cn("w-64 bg-gray-900 text-white flex flex-col", className)}>
      <div className="h-16 flex items-center justify-center border-b border-gray-800">
        <Link href="/admin/dashboard" className="text-xl font-bold">
          Admin Panel
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-gray-800 p-4">
        <Link
          href="/"
          className="block text-sm text-gray-400 hover:text-white"
        >
          ← Back to Store
        </Link>
      </div>
    </aside>
  )
}

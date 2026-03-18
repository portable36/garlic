"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState } from "react"

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: "📊" },
  { name: "Users", href: "/admin/users", icon: "👥" },
  { 
    name: "Products", 
    href: "/admin/products", 
    icon: "📦",
    children: [
      { name: "All Products", href: "/admin/products", icon: "📦" },
      { name: "Add Product", href: "/admin/products/new", icon: "➕" },
      { name: "Settings", href: "/admin/products/settings", icon: "⚙️" },
    ]
  },
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
  const [openMenus, setOpenMenus] = useState<string[]>(["Products"])

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => 
      prev.includes(name) 
        ? prev.filter(m => m !== name)
        : [...prev, name]
    )
  }

  const isActive = (href: string) => pathname === href

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
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={cn(
                      "flex items-center justify-between w-full rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      openMenus.includes(item.name)
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    )}
                  >
                    <span className="flex items-center">
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </span>
                    <span className="text-xs">{openMenus.includes(item.name) ? "▼" : "▶"}</span>
                  </button>
                  {openMenus.includes(item.name) && (
                    <ul className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <Link
                            href={child.href}
                            className={cn(
                              "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                              isActive(child.href)
                                ? "bg-primary/20 text-primary"
                                : "text-gray-400 hover:bg-gray-800 hover:text-white"
                            )}
                          >
                            <span className="mr-3">{child.icon}</span>
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              )}
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

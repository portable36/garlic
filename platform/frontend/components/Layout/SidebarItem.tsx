'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, 
  ChevronDown,
  Package,
  Plus,
  Settings,
  FolderTree,
  LayoutDashboard,
  Users,
  ShoppingCart,
  CreditCard,
  Truck,
  Star,
  BarChart3,
  Shield,
  Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NavItem {
  name: string
  href?: string
  icon?: string
  children?: NavItem[]
}

interface SidebarItemProps {
  item: NavItem
  level?: number
  openMenus: string[]
  onToggle: (name: string) => void
}

const iconMap: Record<string, React.ElementType> = {
  '📊': LayoutDashboard,
  '👥': Users,
  '📦': Package,
  '📂': FolderTree,
  '⚙️': Settings,
  '🛒': ShoppingCart,
  '📋': Layers,
  '🏪': CreditCard,
  '💳': CreditCard,
  '🚚': Truck,
  '⭐': Star,
  '📈': BarChart3,
  '🔐': Shield,
  '➕': Plus,
}

export function getIconComponent(iconName?: string): React.ElementType {
  if (!iconName) return FolderTree
  return iconMap[iconName] || FolderTree
}

export function SidebarItem({ item, level = 0, openMenus, onToggle }: SidebarItemProps) {
  const pathname = usePathname()
  const hasChildren = item.children && item.children.length > 0
  const isOpen = openMenus.includes(item.name)
  const isActive = item.href ? pathname === item.href : false

  // Auto-open parent menus when child is active
  const isChildActive = hasChildren && item.children?.some(
    child => child.href === pathname || 
    (child.children?.some(grandChild => grandChild.href === pathname))
  )

  if (hasChildren) {
    return (
      <div className="w-full">
        <button
          onClick={() => onToggle(item.name)}
          className={cn(
            "flex items-center justify-between w-full rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isOpen || isChildActive
              ? "bg-gray-800 text-white"
              : "text-gray-400 hover:bg-gray-800 hover:text-white"
          )}
          style={{ paddingLeft: `${(level * 12) + 12}px` }}
        >
          <span className="flex items-center">
            <IconComponent name={item.icon} className="w-4 h-4 mr-3" />
            {item.name}
          </span>
          <motion.span
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-xs"
          >
            <ChevronRight className="w-3 h-3" />
          </motion.span>
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {item.children?.map((child) => (
                <SidebarItem
                  key={child.name}
                  item={child}
                  level={level + 1}
                  openMenus={openMenus}
                  onToggle={onToggle}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <Link
      href={item.href || '#'}
      className={cn(
        "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/20 text-primary"
          : "text-gray-400 hover:bg-gray-800 hover:text-white",
        !item.href && "cursor-not-allowed opacity-50"
      )}
      style={{ paddingLeft: `${(level * 12) + 12}px` }}
    >
      <IconComponent name={item.icon} className="w-4 h-4 mr-3" />
      {item.name}
    </Link>
  )
}

function IconComponent({ name, className }: { name?: string; className?: string }) {
  const Icon = getIconComponent(name)
  return <Icon className={className} />
}

interface SidebarProps {
  className?: string
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
  { name: 'Users', href: '/admin/users', icon: '👥' },
  { 
    name: 'Products', 
    href: '/admin/products', 
    icon: '📦',
    children: [
      { name: 'All Products', href: '/admin/products', icon: '📦' },
      { name: 'Add Product', href: '/admin/products/new', icon: '➕' },
      { name: 'Categories', href: '/admin/products/categories', icon: '📂' },
      { name: 'Settings', href: '/admin/products/settings', icon: '⚙️' },
    ]
  },
  { name: 'Orders', href: '/admin/orders', icon: '🛒' },
  { name: 'Inventory', href: '/admin/inventory', icon: '📋' },
  { name: 'Vendors', href: '/admin/vendors', icon: '🏪' },
  { name: 'Payments', href: '/admin/payments', icon: '💳' },
  { name: 'Shipping', href: '/admin/shipping', icon: '🚚' },
  { name: 'Reviews', href: '/admin/reviews', icon: '⭐' },
  { name: 'Analytics', href: '/admin/analytics', icon: '📈' },
  { name: 'Roles', href: '/admin/roles-permissions', icon: '🔐' },
  { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
]

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<string[]>(() => {
    // Auto-open menus based on current pathname
    const open: string[] = ['Products']
    navigation.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(
          child => child.href === pathname
        )
        if (isChildActive) {
          open.push(item.name)
        }
      }
    })
    return open
  })

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => 
      prev.includes(name) 
        ? prev.filter(m => m !== name)
        : [...prev, name]
    )
  }

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
              <SidebarItem
                item={item}
                openMenus={openMenus}
                onToggle={toggleMenu}
              />
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

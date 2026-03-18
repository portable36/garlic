"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import Cookies from "js-cookie"
import { adminAPI } from "@/lib/admin-api"
import { formatCurrency } from "@/lib/utils"

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false)
  const [period, setPeriod] = useState(30)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", period],
    queryFn: () => adminAPI.getAnalytics(period),
    enabled: mounted && !!Cookies.get("access_token"),
  })

  const analytics = data?.data?.analytics

  if (!mounted) return null

  const roleId = Cookies.get("role_id")
  const isAdmin = roleId === "1" || roleId === "3" || roleId === "4"

  if (!Cookies.get("access_token") || !isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Access Denied</h1>
      </div>
    )
  }

  const stats = [
    { title: "Total Users", value: analytics?.total_users || 0, change: "+12%", color: "blue" },
    { title: "Total Orders", value: analytics?.total_orders || 0, change: "+8%", color: "green" },
    { title: "Total Revenue", value: formatCurrency(analytics?.total_revenue || 0), change: "+23%", color: "yellow" },
    { title: "Products", value: analytics?.total_products || 0, change: "+5%", color: "purple" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500">Track your store performance</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(parseInt(e.target.value))}
          className="border rounded-md px-4 py-2"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white p-6 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500">{stat.title}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
            <p className={`text-sm mt-2 ${stat.color === "green" ? "text-green-600" : stat.color === "yellow" ? "text-yellow-600" : stat.color === "purple" ? "text-purple-600" : "text-blue-600"}`}>
              {stat.change} from last period
            </p>
          </div>
        ))}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">Revenue Over Time</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            {isLoading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            ) : (
              <p>Revenue chart will appear here</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">Orders by Status</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            {isLoading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            ) : (
              <div className="space-y-4 w-full">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Completed</span>
                    <span>{analytics?.completed_orders || 0}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-2 bg-green-500 rounded-full" style={{ width: "60%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Pending</span>
                    <span>{analytics?.pending_orders || 0}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-2 bg-yellow-500 rounded-full" style={{ width: "25%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Cancelled</span>
                    <span>{analytics?.cancelled_orders || 0}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-2 bg-red-500 rounded-full" style={{ width: "15%" }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4">Top Selling Products</h3>
        <div className="space-y-4">
          {(analytics?.top_products || []).slice(0, 5).map((product: any, index: number) => (
            <div key={product.id} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-gray-300">{index + 1}</span>
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.sold} sold</p>
                </div>
              </div>
              <p className="font-medium">{formatCurrency(product.revenue)}</p>
            </div>
          ))}
          {(!analytics?.top_products || analytics.top_products.length === 0) && (
            <p className="text-center text-gray-400 py-8">No data available</p>
          )}
        </div>
      </div>
    </div>
  )
}

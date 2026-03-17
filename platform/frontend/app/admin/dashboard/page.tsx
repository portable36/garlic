"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { adminAPI } from "@/lib/admin-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

const icons: Record<string, string> = {
  Users: "👥",
  Package: "📦",
  ShoppingCart: "🛒",
  DollarSign: "💰",
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => adminAPI.getAnalytics(30),
  })

  const analytics = data?.data?.analytics

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  const stats = [
    { title: "Total Users", value: analytics?.total_users || 0, icon: "👥", description: "Registered users" },
    { title: "Total Orders", value: analytics?.total_orders || 0, icon: "🛒", description: "All time orders" },
    { title: "Total Revenue", value: formatCurrency(analytics?.total_revenue || 0), icon: "💰", description: "Revenue to date" },
    { title: "Products", value: analytics?.total_products || 0, icon: "📦", description: "Active products" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your store performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <span className="text-xl">{stat.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-500">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.recent_orders?.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">{order.user_email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(order.total_amount)}</p>
                    <p className="text-xs text-gray-500">{order.status}</p>
                  </div>
                </div>
              ))}
              {(!analytics?.recent_orders || analytics.recent_orders.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No recent orders</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending</span>
                <span className="text-sm font-medium">{analytics?.pending_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed</span>
                <span className="text-sm font-medium">{analytics?.completed_orders || 0}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${analytics?.total_orders ? (analytics.completed_orders / analytics.total_orders) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

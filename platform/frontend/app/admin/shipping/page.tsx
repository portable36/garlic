"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import Cookies from "js-cookie"
import { ordersAPI } from "@/lib/api"

export default function ShippingPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersAPI.list(),
    enabled: mounted && !!Cookies.get("access_token"),
  })

  const orders = data?.data?.orders || []

  const shippingStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
  const statusCounts = shippingStatuses.reduce((acc, status) => {
    acc[status] = orders.filter((o: any) => o.shipping_status === status).length
    return acc
  }, {} as Record<string, number>)

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Shipping</h1>
        <p className="text-gray-500">Track and manage shipping status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-yellow-50 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-yellow-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending || 0}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-blue-600">Processing</p>
          <p className="text-2xl font-bold text-blue-600">{statusCounts.processing || 0}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-purple-600">Shipped</p>
          <p className="text-2xl font-bold text-purple-600">{statusCounts.shipped || 0}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-green-600">Delivered</p>
          <p className="text-2xl font-bold text-green-600">{statusCounts.delivered || 0}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-red-600">Cancelled</p>
          <p className="text-2xl font-bold text-red-600">{statusCounts.cancelled || 0}</p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="bg-white shadow-sm overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shipping Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order: any) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">#{order.id?.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{order.user_email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{order.shipping_address || "N/A"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          order.shipping_status === "delivered"
                            ? "bg-green-100 text-green-800"
                            : order.shipping_status === "shipped"
                            ? "bg-purple-100 text-purple-800"
                            : order.shipping_status === "processing"
                            ? "bg-blue-100 text-blue-800"
                            : order.shipping_status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {order.shipping_status || "pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {order.tracking_number || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

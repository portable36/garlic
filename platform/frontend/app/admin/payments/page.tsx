"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import Cookies from "js-cookie"
import { ordersAPI } from "@/lib/api"

export default function PaymentsPage() {
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

  const payments = orders.map((order: any) => ({
    id: order.id,
    amount: order.total_amount,
    method: order.payment_method || "N/A",
    status: order.payment_status || "pending",
    date: order.created_at,
    customer: order.user_email || "N/A",
  }))

  const totalPayments = payments.length
  const completedPayments = payments.filter((p: any) => p.status === "completed").length
  const pendingPayments = payments.filter((p: any) => p.status === "pending").length
  const failedPayments = payments.filter((p: any) => p.status === "failed").length
  const totalRevenue = payments
    .filter((p: any) => p.status === "completed")
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

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
        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-500">Manage payments and transactions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Total Transactions</p>
          <p className="text-2xl font-bold">{totalPayments}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-green-600">Completed</p>
          <p className="text-2xl font-bold text-green-600">{completedPayments}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-yellow-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingPayments}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-red-600">Failed</p>
          <p className="text-2xl font-bold text-red-600">{failedPayments}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-blue-600">Total Revenue</p>
          <p className="text-2xl font-bold text-blue-600">${totalRevenue.toFixed(2)}</p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment: any) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">#{payment.id?.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{payment.customer}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">${payment.amount?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{payment.method}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          payment.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : payment.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(payment.date).toLocaleDateString()}
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

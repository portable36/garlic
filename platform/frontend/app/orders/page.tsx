'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import Cookies from 'js-cookie'
import { ordersAPI } from '@/lib/api'

export default function OrdersPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersAPI.list(),
    enabled: mounted && !!Cookies.get('access_token'),
  })

  const orders = data?.data?.orders || []

  if (!mounted) {
    return null
  }

  if (!Cookies.get('access_token')) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Please login to view your orders</h1>
        <Link href="/auth/login" className="text-primary-600 hover:text-primary-700">
          Login
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No orders yet</p>
          <Link href="/products" className="text-primary-600 hover:text-primary-700">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${order.total_amount?.toFixed(2)}</p>
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded ${
                      order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

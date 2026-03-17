'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import Cookies from 'js-cookie'
import { ordersAPI } from '@/lib/api'

export default function OrderDetailPage() {
  const params = useParams()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['order', params.id],
    queryFn: () => ordersAPI.get(params.id as string),
    enabled: mounted && !!Cookies.get('access_token'),
  })

  const order = data?.data?.order

  if (!mounted) {
    return null
  }

  if (!Cookies.get('access_token')) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Please login to view this order</h1>
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

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/orders" className="text-primary-600 hover:text-primary-700">
          &larr; Back to Orders
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Order #{order.id.slice(0, 8)}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-medium">Order Items</h2>
            </div>
            <div className="divide-y">
              {order.items?.map((item: any) => (
                <div key={item.id} className="px-6 py-4 flex items-center">
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-gray-500">
                      ${item.product_price?.toFixed(2)} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">
                    ${item.subtotal?.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span
                  className={`px-2 py-1 text-xs rounded ${
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
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Status</span>
                <span>{order.payment_status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method</span>
                <span>{order.payment_method}</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${order.total_amount?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Shipping Address
              </h3>
              <p className="text-gray-500 text-sm">{order.shipping_address}</p>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              <p>Ordered on {new Date(order.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

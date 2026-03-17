'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersAPI } from '@/lib/api'

export default function CheckoutPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    shipping_address: '',
    payment_method: 'credit_card',
  })

  const createOrderMutation = useMutation({
    mutationFn: (data: typeof formData) => ordersAPI.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      router.push(`/orders/${response.data.order.id}`)
    },
    onError: () => {
      alert('Failed to create order')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createOrderMutation.mutate(formData)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="max-w-xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Shipping Address
            </label>
            <textarea
              required
              value={formData.shipping_address}
              onChange={(e) =>
                setFormData({ ...formData, shipping_address: e.target.value })
              }
              rows={4}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Enter your shipping address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Payment Method
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) =>
                setFormData({ ...formData, payment_method: e.target.value })
              }
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={createOrderMutation.isPending}
            className="w-full bg-primary-600 text-white py-3 px-6 rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {createOrderMutation.isPending ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </form>
    </div>
  )
}

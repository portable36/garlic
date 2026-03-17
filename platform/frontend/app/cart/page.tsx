'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Cookies from 'js-cookie'
import { cartAPI } from '@/lib/api'

export default function CartPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartAPI.get(),
    enabled: mounted && !!Cookies.get('access_token'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartAPI.update({ product_id: productId, quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (productId: string) => cartAPI.remove(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })

  const cart = data?.data?.cart
  const items = cart?.items || []
  const total = cart?.total || 0

  if (!mounted) {
    return null
  }

  if (!Cookies.get('access_token')) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Please login to view your cart</h1>
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <Link href="/products" className="text-primary-600 hover:text-primary-700">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {items.map((item: any) => (
              <div
                key={item.product_id}
                className="flex items-center py-4 border-b"
              >
                <div className="w-24 h-24 bg-gray-100 rounded-md flex-shrink-0">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium">{item.name}</h3>
                  <p className="text-gray-500">${item.price?.toFixed(2)}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          productId: item.product_id,
                          quantity: Math.max(0, item.quantity - 1),
                        })
                      }
                      className="p-1 border rounded"
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          productId: item.product_id,
                          quantity: item.quantity + 1,
                        })
                      }
                      className="p-1 border rounded"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeMutation.mutate(item.product_id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="ml-4 text-right">
                  <p className="font-medium">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-1">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-4">Order Summary</h3>
              <div className="flex justify-between mb-2">
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-4">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={() => router.push('/checkout')}
                className="mt-6 w-full bg-primary-600 text-white py-3 px-6 rounded-md hover:bg-primary-700"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

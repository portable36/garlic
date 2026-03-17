'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsAPI, cartAPI, authAPI } from '@/lib/api'
import Cookies from 'js-cookie'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['product', params.id],
    queryFn: () => productsAPI.get(params.id as string),
  })

  const addToCartMutation = useMutation({
    mutationFn: (qty: number) =>
      cartAPI.add({
        product_id: params.id as string,
        quantity: qty,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      setIsAdding(false)
      alert('Added to cart!')
    },
    onError: () => {
      setIsAdding(false)
      const token = Cookies.get('access_token')
      if (!token) {
        router.push('/login')
      } else {
        alert('Failed to add to cart')
      }
    },
  })

  const product = data?.data?.product

  const handleAddToCart = () => {
    const token = Cookies.get('access_token')
    if (!token) {
      router.push('/login')
      return
    }
    setIsAdding(true)
    addToCartMutation.mutate(quantity)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
          {product.images?.[0] ? (
            <img
              src={product.images[0].image_url}
              alt={product.name}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-gray-400">No Image</span>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <p className="mt-4 text-2xl font-semibold text-primary-600">
            ${product.price?.toFixed(2)}
          </p>
          <p className="mt-4 text-gray-600">{product.description}</p>
          <p className="mt-2 text-gray-500">Stock: {product.stock}</p>
          {product.category && (
            <p className="mt-2 text-gray-500">
              Category: {product.category.name}
            </p>
          )}
          <div className="mt-8">
            <label className="block text-sm font-medium text-gray-700">
              Quantity
            </label>
            <div className="mt-2 flex items-center space-x-4">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2 border rounded-md"
              >
                -
              </button>
              <span className="text-lg">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                className="p-2 border rounded-md"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={isAdding || product.stock === 0}
              className="mt-6 w-full bg-primary-600 text-white py-3 px-6 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? 'Adding...' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import Cookies from 'js-cookie'
import { productsAPI } from '@/lib/api'
import type { Category } from '@/types/product'

interface VariationFormData {
  id: string
  sku: string
  barcode: string
  attributes: Record<string, string>
  price: string
  stock: string
  isAutoSKU: boolean
  isAutoBarcode: boolean
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const [mounted, setMounted] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    stock: '',
    discount: '',
    status: 'draft',
    is_active: true,
  })

  const [variations, setVariations] = useState<VariationFormData[]>([])
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Fetch product data
  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsAPI.get(productId),
    enabled: mounted && !!productId,
  })

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsAPI.getCategories(),
    enabled: mounted,
  })

  const categories: Category[] = categoriesData?.data?.categories || []
  const product = productData?.data?.product

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        category_id: product.category_id || '',
        stock: product.stock?.toString() || '',
        discount: product.discount?.toString() || '',
        status: product.status || 'draft',
        is_active: product.is_active ?? true,
      })
    }
  }, [product])

  // Auth check
  useEffect(() => {
    if (mounted) {
      const roleId = Cookies.get('role_id')
      const isAdmin = roleId === '1' || roleId === '3' || roleId === '4'
      if (!Cookies.get('access_token') || !isAdmin) {
        router.push('/auth/login')
      }
    }
  }, [mounted, router])

  const generateSKU = async (index: number) => {
    try {
      const response = await productsAPI.generateSKU({})
      const sku = response.data.sku
      const newVariations = [...variations]
      newVariations[index].sku = sku
      setVariations(newVariations)
    } catch (err) {
      console.error('Failed to generate SKU:', err)
    }
  }

  const generateBarcode = async (index: number) => {
    try {
      const response = await productsAPI.generateBarcode({})
      const barcode = response.data.barcode
      const newVariations = [...variations]
      newVariations[index].barcode = barcode
      setVariations(newVariations)
    } catch (err) {
      console.error('Failed to generate Barcode:', err)
    }
  }

  const handleVariationChange = (index: number, field: keyof VariationFormData, value: any) => {
    const newVariations = [...variations]
    if (field === 'attributes') {
      newVariations[index].attributes = { ...newVariations[index].attributes, ...value }
    } else {
      (newVariations[index] as any)[field] = value
    }
    setVariations(newVariations)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category_id: formData.category_id || undefined,
        stock: parseInt(formData.stock) || 0,
        discount: parseFloat(formData.discount) || 0,
        status: formData.status,
        is_active: formData.is_active,
      }

      await productsAPI.update(productId, updateData)

      router.push('/admin/products')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update product')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted) return null

  if (isLoadingProduct) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
        <p className="text-gray-500">Update product details</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock
              </label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                Active
              </label>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin/products')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

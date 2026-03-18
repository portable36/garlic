'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import Cookies from 'js-cookie'
import { productsAPI } from '@/lib/api'
import type { Category, CreateVariationRequest } from '@/types/product'

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

export default function NewProductPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    stock: '',
    discount: '',
    status: 'draft',
  })

  const [variations, setVariations] = useState<VariationFormData[]>([
    {
      id: '1',
      sku: '',
      barcode: '',
      attributes: {},
      price: '',
      stock: '',
      isAutoSKU: true,
      isAutoBarcode: true,
    },
  ])

  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [attributeOptions, setAttributeOptions] = useState<string[]>(['Color', 'Size', 'Material'])

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsAPI.getCategories(),
    enabled: mounted,
  })

  const categories: Category[] = categoriesData?.data?.categories || []

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const generateSKU = async (index: number, categoryId?: string) => {
    try {
      const response = await productsAPI.generateSKU({
        prefix: 'PRD',
        suffix: '',
        strategy: 'incremental',
        category_id: categoryId,
      })
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
      const response = await productsAPI.generateBarcode({
        prefix: '200',
        suffix: '',
        format: 'ean13',
      })
      const barcode = response.data.barcode
      const newVariations = [...variations]
      newVariations[index].barcode = barcode
      setVariations(newVariations)
    } catch (err) {
      console.error('Failed to generate barcode:', err)
    }
  }

  const handleVariationChange = (index: number, field: string, value: any) => {
    const newVariations = [...variations]
    if (field === 'attributes') {
      newVariations[index].attributes = { ...newVariations[index].attributes, ...value }
    } else {
      (newVariations[index] as any)[field] = value
    }
    setVariations(newVariations)
  }

  const addVariation = () => {
    setVariations([
      ...variations,
      {
        id: Date.now().toString(),
        sku: '',
        barcode: '',
        attributes: {},
        price: '',
        stock: '',
        isAutoSKU: true,
        isAutoBarcode: true,
      },
    ])
  }

  const removeVariation = (index: number) => {
    if (variations.length > 1) {
      setVariations(variations.filter((_, i) => i !== index))
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImages([...images, ...files])

    // Generate previews
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      // Build variations data
      const variationsData = variations.map((v) => ({
        sku: v.sku || undefined,
        barcode: v.barcode || undefined,
        attributes: v.attributes,
        price: v.price ? parseFloat(v.price) : parseFloat(formData.price) || 0,
        stock: v.stock ? parseInt(v.stock) : parseInt(formData.stock) || 0,
      }))

      // Create product with variations
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category_id: formData.category_id || undefined,
        stock: parseInt(formData.stock) || 0,
        discount: parseFloat(formData.discount) || 0,
        status: formData.status,
        variations: variationsData,
      }

      const response = await productsAPI.create(productData)
      const productId = response.data.product.id

      // Upload images
      for (const image of images) {
        const formDataImg = new FormData()
        formDataImg.append('image', image)
        await productsAPI.uploadImage(productId, formDataImg)
      }

      router.push('/admin/products')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create product')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
        <p className="text-gray-500">Create a new product with variations</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter product name"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter product description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing & Inventory */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Pricing & Inventory</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Price *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full pl-8 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Variations */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Product Variations</h2>
            <button
              type="button"
              onClick={addVariation}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add Variation
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Attributes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Barcode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stock
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {variations.map((variation, index) => (
                  <tr key={variation.id}>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        {attributeOptions.map((attr) => (
                          <input
                            key={attr}
                            type="text"
                            placeholder={attr}
                            value={variation.attributes?.[attr] || ''}
                            onChange={(e) =>
                              handleVariationChange(index, 'attributes', { [attr]: e.target.value })
                            }
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={variation.sku}
                          onChange={(e) => handleVariationChange(index, 'sku', e.target.value)}
                          className="w-32 border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="Auto-generated"
                        />
                        {variation.isAutoSKU && (
                          <button
                            type="button"
                            onClick={() => generateSKU(index, formData.category_id)}
                            className="text-xs text-primary-600 hover:text-primary-700"
                          >
                            Generate
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={variation.barcode}
                          onChange={(e) => handleVariationChange(index, 'barcode', e.target.value)}
                          className="w-32 border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="Auto-generated"
                        />
                        {variation.isAutoBarcode && (
                          <button
                            type="button"
                            onClick={() => generateBarcode(index)}
                            className="text-xs text-primary-600 hover:text-primary-700"
                          >
                            Generate
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={variation.price}
                        onChange={(e) => handleVariationChange(index, 'price', e.target.value)}
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder={formData.price}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={variation.stock}
                        onChange={(e) => handleVariationChange(index, 'stock', e.target.value)}
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder={formData.stock}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {variations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVariation(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Product Images</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="cursor-pointer">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </label>
          </div>

          {imagePreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Publish */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Publish</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={formData.status === 'draft'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="mr-2"
              />
              <span className="font-medium">Save as Draft</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="status"
                value="active"
                checked={formData.status === 'active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="mr-2"
              />
              <span className="font-medium">Publish Immediately</span>
            </label>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/admin/products')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

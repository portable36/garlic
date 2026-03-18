"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import Cookies from "js-cookie"
import { productsAPI } from "@/lib/api"

export default function InventoryPage() {
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ["products", 1, 100],
    queryFn: () => productsAPI.list({ page: 1, page_size: 100 }),
    enabled: mounted && !!Cookies.get("access_token"),
  })

  const products = data?.data?.products || []

  const filteredProducts = products.filter((product: any) => {
    if (filter === "all") return true
    if (filter === "low-stock") return product.stock > 0 && product.stock < 10
    if (filter === "out-of-stock") return product.stock === 0
    if (filter === "in-stock") return product.stock >= 10
    return true
  })

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

  const totalProducts = products.length
  const inStock = products.filter((p: any) => p.stock >= 10).length
  const lowStock = products.filter((p: any) => p.stock > 0 && p.stock < 10).length
  const outOfStock = products.filter((p: any) => p.stock === 0).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="text-gray-500">Manage product stock levels</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-2xl font-bold">{totalProducts}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-green-600">In Stock</p>
          <p className="text-2xl font-bold text-green-600">{inStock}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-yellow-600">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-600">{lowStock}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-red-600">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{outOfStock}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "in-stock", "low-stock", "out-of-stock"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm ${
              filter === f
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </button>
        ))}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product: any) => (
                <tr key={product.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.description?.slice(0, 50)}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">SKU-{product.id?.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">${product.price?.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{product.stock}</td>
                  <td className="px-6 py-4">
                    {product.stock === 0 ? (
                      <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Out of Stock</span>
                    ) : product.stock < 10 ? (
                      <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">Low Stock</span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">In Stock</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

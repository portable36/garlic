'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FolderTree, 
  Plus, 
  Pencil, 
  Trash2, 
  X,
  ChevronRight,
  Loader2
} from 'lucide-react'
import Cookies from 'js-cookie'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
  description?: string
  parent_id?: string
  children?: Category[]
}

export default function CategoriesPage() {
  const [mounted, setMounted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: '',
  })
  const queryClient = useQueryClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['categories-tree'],
    queryFn: async () => {
      const response = await fetch('http://localhost/api/products/categories/tree')
      return response.json()
    },
    enabled: mounted && !!Cookies.get('access_token'),
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('http://localhost/api/products/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-tree'] })
      setIsModalOpen(false)
      setFormData({ name: '', description: '', parent_id: '' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`http://localhost/api/products/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-tree'] })
      setIsModalOpen(false)
      setEditingCategory(null)
      setFormData({ name: '', description: '', parent_id: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`http://localhost/api/products/categories/${id}`, {
        method: 'DELETE',
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-tree'] })
    },
  })

  const categories: Category[] = data?.categories || []

  const getAllCategories = (cats: Category[], level = 0): Category[] => {
    let result: Category[] = []
    for (const cat of cats) {
      result.push({ ...cat, name: '  '.repeat(level) + cat.name })
      if (cat.children?.length) {
        result = result.concat(getAllCategories(cat.children, level + 1))
      }
    }
    return result
  }

  const allCategories = getAllCategories(categories)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      name: formData.name,
      description: formData.description,
      parent_id: formData.parent_id || null,
    }
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const openEditModal = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name.trim(),
      description: category.description || '',
      parent_id: category.parent_id || '',
    })
    setIsModalOpen(true)
  }

  if (!mounted) return null

  const roleId = Cookies.get('role_id')
  const isAdmin = roleId === '1' || roleId === '3' || roleId === '4'
  
  if (!Cookies.get('access_token') || !isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Access Denied</h1>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const renderCategoryTree = (cats: Category[], level = 0) => {
    return cats.map((category, index) => (
      <motion.div
        key={category.id}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 border-b">
          <div className="flex items-center">
            <FolderTree 
              className={cn(
                "w-4 h-4 mr-2", 
                level === 0 ? "text-primary" : "text-gray-400"
              )} 
            />
            <span style={{ marginLeft: level * 20 }} className="text-gray-700 font-medium">
              {level > 0 && <ChevronRight className="w-3 h-3 inline mr-1" />}
              {category.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openEditModal(category)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this category?')) {
                  deleteMutation.mutate(category.id)
                }
              }}
              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {category.children && category.children.length > 0 && renderCategoryTree(category.children, level + 1)}
      </motion.div>
    ))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <FolderTree className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setEditingCategory(null)
            setFormData({ name: '', description: '', parent_id: '' })
            setIsModalOpen(true)
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </motion.button>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <FolderTree className="w-12 h-12 mb-4 text-gray-300" />
            <p>No categories found. Add your first category!</p>
          </div>
        ) : (
          renderCategoryTree(categories)
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter category name"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                    placeholder="Enter category description"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Category
                  </label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">None (Top Level)</option>
                    {allCategories
                      .filter((c) => c.id !== editingCategory?.id)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    {editingCategory ? 'Update' : 'Create'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

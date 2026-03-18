"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Cookies from "js-cookie"
import { adminAPI } from "@/lib/admin-api"

export default function VendorsPage() {
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState("all")
  const queryClient = useQueryClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ["admin-vendors", filter],
    queryFn: () => adminAPI.getVendors(filter === "all" ? undefined : filter),
    enabled: mounted && !!Cookies.get("access_token"),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminAPI.approveVendor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-vendors"] }),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminAPI.rejectVendor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-vendors"] }),
  })

  const vendors = data?.data?.vendors || []

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
        <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
        <p className="text-gray-500">Manage vendor accounts and approvals</p>
      </div>

      <div className="flex gap-2">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm ${
              filter === f ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="bg-white shadow-sm overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No vendors found
                  </td>
                </tr>
              ) : (
                vendors.map((vendor: any) => (
                  <tr key={vendor.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{vendor.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{vendor.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          vendor.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : vendor.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(vendor.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {vendor.status === "pending" && (
                        <>
                          <button
                            onClick={() => approveMutation.mutate(vendor.id)}
                            className="text-green-600 hover:text-green-700 text-sm mr-3"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(vendor.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Reject
                          </button>
                        </>
                      )}
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

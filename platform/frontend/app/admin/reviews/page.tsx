"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Cookies from "js-cookie"
import { adminAPI } from "@/lib/admin-api"

export default function ReviewsPage() {
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState("all")
  const queryClient = useQueryClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", filter],
    queryFn: () => adminAPI.getReviews(filter === "all" ? undefined : filter),
    enabled: mounted && !!Cookies.get("access_token"),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminAPI.approveReview(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminAPI.rejectReview(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }),
  })

  const reviews = data?.data?.reviews || []

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

  const getStars = (rating: number) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
        <p className="text-gray-500">Manage product reviews</p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Review</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No reviews found
                  </td>
                </tr>
              ) : (
                reviews.map((review: any) => (
                  <tr key={review.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{review.product_name || "Product"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{review.user_email}</td>
                    <td className="px-6 py-4 text-sm text-yellow-500">{getStars(review.rating || 5)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {review.comment}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          review.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : review.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {review.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {review.status === "pending" && (
                        <>
                          <button
                            onClick={() => approveMutation.mutate(review.id)}
                            className="text-green-600 hover:text-green-700 text-sm mr-3"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(review.id)}
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

"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Cookies from "js-cookie"
import { adminAPI } from "@/lib/admin-api"
import { formatDate } from "@/lib/utils"

export default function UsersPage() {
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => adminAPI.getUsers({ page, limit: 20, search }),
    enabled: mounted && !!Cookies.get("access_token"),
  })

  const banMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminAPI.banUser(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  })

  const unbanMutation = useMutation({
    mutationFn: (id: string) => adminAPI.unbanUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  })

  const users = data?.data?.users || []
  const total = data?.data?.total || 0

  if (!mounted) return null

  if (!Cookies.get("access_token")) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Access Denied</h1>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500">Manage user accounts and permissions</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <input
          type="text"
          placeholder="Search users by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded-md px-4 py-2"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-white shadow-sm overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user: any) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                        {user.role_name || "User"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_banned ? (
                        <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">
                          Banned
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {user.is_banned ? (
                        <button
                          onClick={() => unbanMutation.mutate(user.id)}
                          className="text-green-600 hover:text-green-700 text-sm"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const reason = prompt("Enter ban reason:")
                            if (reason) banMutation.mutate({ id: user.id, reason })
                          }}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Ban
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">Page {page} ({Math.ceil(total / 20)} pages)</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * 20 >= total}
              className="px-4 py-2 border rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}

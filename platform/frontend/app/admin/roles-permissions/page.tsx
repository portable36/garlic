"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Cookies from "js-cookie"
import { adminAPI } from "@/lib/admin-api"

export default function RolesPage() {
  const [mounted, setMounted] = useState(false)
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRole, setNewRole] = useState({ name: "", description: "" })
  const queryClient = useQueryClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => adminAPI.getRoles(),
    enabled: mounted && !!Cookies.get("access_token"),
  })

  const { data: permissionsData } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: () => adminAPI.getPermissions(),
    enabled: mounted && !!Cookies.get("access_token"),
  })

  const createRoleMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => adminAPI.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] })
      setShowCreateModal(false)
      setNewRole({ name: "", description: "" })
    },
  })

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: number[] }) =>
      adminAPI.updateRolePermissions(id, permissions),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-roles"] }),
  })

  const deleteRoleMutation = useMutation({
    mutationFn: (id: number) => adminAPI.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] })
      setSelectedRole(null)
    },
  })

  const roles = rolesData?.data?.roles || []
  const permissions = permissionsData?.data?.permissions || []

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
          <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-500">Manage roles and their permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Create Role
        </button>
      </div>

      {rolesLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-medium mb-4">Roles</h2>
            <div className="space-y-2">
              {roles.map((role: any) => (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedRole?.id === role.id
                      ? "bg-primary-100 border border-primary-300"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="font-medium">{role.name}</div>
                  <div className="text-sm text-gray-500">{role.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-4">
            {selectedRole ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-medium">{selectedRole.name}</h2>
                    <p className="text-sm text-gray-500">{selectedRole.description}</p>
                  </div>
                  {selectedRole.id > 4 && (
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this role?")) {
                          deleteRoleMutation.mutate(selectedRole.id)
                        }
                      }}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-3">Permissions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {permissions.map((perm: any) => {
                      const hasPermission = selectedRole.permissions?.some(
                        (p: any) => p.id === perm.id
                      )
                      return (
                        <label
                          key={perm.id}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={hasPermission}
                            onChange={(e) => {
                              const currentPerms = selectedRole.permissions?.map((p: any) => p.id) || []
                              const newPerms = e.target.checked
                                ? [...currentPerms, perm.id]
                                : currentPerms.filter((id: number) => id !== perm.id)
                              updatePermissionsMutation.mutate({
                                id: selectedRole.id,
                                permissions: newPerms,
                              })
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{perm.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-12">
                Select a role to view and edit permissions
              </div>
            )}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-medium mb-4">Create Role</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createRoleMutation.mutate(newRole)
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoleMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {createRoleMutation.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Cookies from "js-cookie"
import { adminAPI } from "@/lib/admin-api"

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings", selectedGroup],
    queryFn: () => adminAPI.getSettings(selectedGroup || undefined),
    enabled: mounted && !!Cookies.get("access_token"),
  })

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Record<string, string>) => adminAPI.updateSettings(settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-settings"] }),
  })

  const settings = data?.data?.settings || []
  const grouped = data?.data?.grouped || {}

  if (!mounted) return null

  if (!Cookies.get("access_token")) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Access Denied</h1>
      </div>
    )
  }

  const groups = Object.keys(grouped)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Configure site settings</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-medium mb-4">Categories</h2>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedGroup(null)}
                className={`w-full text-left p-2 rounded-md ${
                  !selectedGroup ? "bg-primary-100 text-primary-700" : "hover:bg-gray-100"
                }`}
              >
                All Settings
              </button>
              {groups.map((group) => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`w-full text-left p-2 rounded-md capitalize ${
                    selectedGroup === group ? "bg-primary-100 text-primary-700" : "hover:bg-gray-100"
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">
                {selectedGroup ? selectedGroup : "All Settings"}
              </h2>
              <button
                onClick={() => {
                  const settingsMap: Record<string, string> = {}
                  settings.forEach((s: any) => {
                    const el = document.getElementById(`setting-${s.setting_key}`) as HTMLInputElement
                    if (el) settingsMap[s.setting_key] = el.value
                  })
                  if (Object.keys(settingsMap).length > 0) {
                    updateSettingsMutation.mutate(settingsMap)
                  }
                }}
                disabled={updateSettingsMutation.isPending}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <div className="space-y-4">
              {settings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No settings found</p>
              ) : (
                settings.map((setting: any) => (
                  <div key={setting.setting_key} className="flex items-center justify-between py-3 border-b">
                    <div className="flex-1 mr-4">
                      <label className="block text-sm font-medium text-gray-700">
                        {setting.setting_key}
                      </label>
                      {setting.setting_type === "textarea" ? (
                        <textarea
                          id={`setting-${setting.setting_key}`}
                          defaultValue={setting.setting_value}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                          rows={3}
                        />
                      ) : setting.setting_type === "boolean" ? (
                        <input
                          type="checkbox"
                          id={`setting-${setting.setting_key}`}
                          defaultChecked={setting.setting_value === "true"}
                          className="mt-1"
                        />
                      ) : (
                        <input
                          type={setting.setting_type === "number" ? "number" : "text"}
                          id={`setting-${setting.setting_key}`}
                          defaultValue={setting.setting_value}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

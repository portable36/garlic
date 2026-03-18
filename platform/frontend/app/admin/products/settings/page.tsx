"use client"

import { useEffect, useState } from "react"
import { settingsAPI } from "@/lib/api"

interface ProductSettings {
  sku_prefix: string
  sku_suffix: string
  sku_strategy: string
  sku_category_code: string
  barcode_prefix: string
  barcode_suffix: string
  barcode_format: string
}

export default function ProductSettingsPage() {
  const [settings, setSettings] = useState<ProductSettings>({
    sku_prefix: "PRD",
    sku_suffix: "",
    sku_strategy: "incremental",
    sku_category_code: "true",
    barcode_prefix: "200",
    barcode_suffix: "",
    barcode_format: "ean13",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await settingsAPI.list("product")
      const data = response.data.settings || []
      
      const settingsMap: Record<string, string> = {}
      data.forEach((s: any) => {
        settingsMap[s.setting_key] = s.setting_value
      })
      
      setSettings({
        sku_prefix: settingsMap.sku_prefix || "PRD",
        sku_suffix: settingsMap.sku_suffix || "",
        sku_strategy: settingsMap.sku_strategy || "incremental",
        sku_category_code: settingsMap.sku_category_code || "true",
        barcode_prefix: settingsMap.barcode_prefix || "200",
        barcode_suffix: settingsMap.barcode_suffix || "",
        barcode_format: settingsMap.barcode_format || "ean13",
      })
    } catch (err) {
      console.error("Failed to load settings:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      const settingsToUpdate: Record<string, string> = {
        sku_prefix: settings.sku_prefix,
        sku_suffix: settings.sku_suffix,
        sku_strategy: settings.sku_strategy,
        sku_category_code: settings.sku_category_code,
        barcode_prefix: settings.barcode_prefix,
        barcode_suffix: settings.barcode_suffix,
        barcode_format: settings.barcode_format,
      }
      
      await settingsAPI.updateBatch(settingsToUpdate)
      setMessage({ type: "success", text: "Settings saved successfully!" })
    } catch (err) {
      console.error("Failed to save settings:", err)
      setMessage({ type: "error", text: "Failed to save settings" })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof ProductSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Settings</h1>
        <p className="text-gray-600">Configure SKU and barcode generation settings</p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-md ${
          message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* SKU Settings */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">SKU Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU Prefix
              </label>
              <input
                type="text"
                value={settings.sku_prefix}
                onChange={(e) => handleChange("sku_prefix", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., PRD"
              />
              <p className="mt-1 text-sm text-gray-500">Prefix added to all SKUs</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU Suffix
              </label>
              <input
                type="text"
                value={settings.sku_suffix}
                onChange={(e) => handleChange("sku_suffix", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., -A"
              />
              <p className="mt-1 text-sm text-gray-500">Suffix added to all SKUs (optional)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU Generation Strategy
              </label>
              <select
                value={settings.sku_strategy}
                onChange={(e) => handleChange("sku_strategy", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="incremental">Incremental (0001, 0002...)</option>
                <option value="random">Random</option>
                <option value="timestamp">Timestamp</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="sku_category_code"
                checked={settings.sku_category_code === "true"}
                onChange={(e) => handleChange("sku_category_code", e.target.checked ? "true" : "false")}
                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="sku_category_code" className="ml-2 block text-sm text-gray-700">
                Include category code in SKU
              </label>
            </div>
          </div>
        </div>

        {/* Barcode Settings */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Barcode Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Barcode Prefix
              </label>
              <input
                type="text"
                value={settings.barcode_prefix}
                onChange={(e) => handleChange("barcode_prefix", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., 200"
              />
              <p className="mt-1 text-sm text-gray-500">First digits of the barcode (for EAN-13)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Barcode Suffix
              </label>
              <input
                type="text"
                value={settings.barcode_suffix}
                onChange={(e) => handleChange("barcode_suffix", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Optional"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Barcode Format
              </label>
              <select
                value={settings.barcode_format}
                onChange={(e) => handleChange("barcode_format", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ean13">EAN-13</option>
                <option value="code128">Code 128</option>
                <option value="qr">QR Code</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  )
}

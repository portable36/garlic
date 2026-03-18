"use client"

import React, { useState, useEffect } from "react"
import { useWizard } from "./WizardContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, RefreshCw, Pencil, Check, X } from "lucide-react"

export function VariationsStep() {
  const { state, updateVariations, nextStep, prevStep, generateVariations } = useWizard()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editData, setEditData] = useState({ sku: "", price: 0, stock: 0 })
  const [regenerating, setRegenerating] = useState(false)

  const handleRegenerate = async () => {
    setRegenerating(true)
    const productCode = state.basicInfo.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10) || "PRODUCT"
    await generateVariations(productCode)
    setRegenerating(false)
  }

  const startEdit = (index: number) => {
    const variation = state.variations[index]
    setEditingIndex(index)
    setEditData({
      sku: variation.sku,
      price: variation.price,
      stock: variation.stock,
    })
  }

  const saveEdit = () => {
    if (editingIndex === null) return
    const newVariations = [...state.variations]
    newVariations[editingIndex] = {
      ...newVariations[editingIndex],
      sku: editData.sku,
      price: editData.price,
      stock: editData.stock,
    }
    updateVariations(newVariations)
    setEditingIndex(null)
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditData({ sku: "", price: 0, stock: 0 })
  }

  const toggleVariationActive = (index: number) => {
    const newVariations = [...state.variations]
    newVariations[index] = {
      ...newVariations[index],
      is_active: !newVariations[index].is_active,
    }
    updateVariations(newVariations)
  }

  const bulkUpdatePrice = (price: number) => {
    const newVariations = state.variations.map((v) => ({
      ...v,
      price,
    }))
    updateVariations(newVariations)
  }

  const bulkUpdateStock = (stock: number) => {
    const newVariations = state.variations.map((v) => ({
      ...v,
      stock,
    }))
    updateVariations(newVariations)
  }

  const attributeCodes = state.attributeSelections.map((s) => s.attribute_code)

  if (state.attributeSelections.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Variations</h2>
          <p className="text-muted-foreground">No attributes selected. Go back to select attributes.</p>
        </div>
        <Button variant="outline" onClick={prevStep}>
          Back to Attributes
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Product Variations</h2>
          <p className="text-muted-foreground">
            {state.variations.length} variations generated from {state.attributeSelections.length} attributes
          </p>
          {state.basicInfo.brand_code && (
            <p className="text-xs text-muted-foreground mt-1">
              SKU Format: {state.basicInfo.brand_code}-[CODE]-[ATTR_CODES]-[SUFFIX]
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={regenerating}
        >
          {regenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Regenerate
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Actions</CardTitle>
          <CardDescription>Apply price and stock to all variations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Label>Price:</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="w-32"
                placeholder="0.00"
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val)) bulkUpdatePrice(val)
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label>Stock:</Label>
              <Input
                type="number"
                min="0"
                className="w-32"
                placeholder="0"
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  if (!isNaN(val)) bulkUpdateStock(val)
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {state.variations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No variations to display. Please select attribute values in the previous step.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {state.variations.map((variation, index) => (
              <Card key={index} className={variation.is_active === false ? "opacity-50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={variation.is_active !== false}
                      onCheckedChange={() => toggleVariationActive(index)}
                      className="mt-2"
                    />

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {variation.sku}
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(variation.attributes).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {editingIndex === index ? (
                        <div className="flex items-center gap-4 pt-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">SKU:</Label>
                            <Input
                              value={editData.sku}
                              onChange={(e) => setEditData({ ...editData, sku: e.target.value })}
                              className="h-8 w-48"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Price:</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editData.price}
                              onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) || 0 })}
                              className="h-8 w-24"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Stock:</Label>
                            <Input
                              type="number"
                              value={editData.stock}
                              onChange={(e) => setEditData({ ...editData, stock: parseInt(e.target.value) || 0 })}
                              className="h-8 w-20"
                            />
                          </div>
                          <Button size="sm" onClick={saveEdit}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 pt-2 text-sm">
                          <span className="text-muted-foreground">
                            Price: <span className="font-medium">${variation.price.toFixed(2)}</span>
                          </span>
                          <Separator orientation="vertical" className="h-4" />
                          <span className="text-muted-foreground">
                            Stock: <span className="font-medium">{variation.stock}</span>
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto"
                            onClick={() => startEdit(index)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={nextStep} disabled={state.variations.length === 0}>
          Next: Add Images
        </Button>
      </div>
    </div>
  )
}

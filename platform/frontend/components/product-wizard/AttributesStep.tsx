"use client"

import React, { useState, useEffect } from "react"
import { useWizard } from "./WizardContext"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { productAPI } from "@/lib/product-api"
import { AttributeDefinition, AttributeSelection, AttributeValue } from "@/types/product-wizard"
import { Loader2, ChevronRight, ChevronDown } from "lucide-react"

export function AttributesStep() {
  const { state, updateAttributeSelections, nextStep, prevStep, generateVariations } = useWizard()
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedAttrs, setExpandedAttrs] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const response = await productAPI.getAttributes()
        setAttributes(response.data.attributes || [])
      } catch (error) {
        console.error("Failed to fetch attributes:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchAttributes()
  }, [])

  const toggleAttribute = (attrId: string) => {
    const newSelections = state.attributeSelections.filter((s) => s.attribute_id !== attrId)
    updateAttributeSelections(newSelections)
    setExpandedAttrs((prev) => {
      const newSet = new Set(prev)
      newSet.delete(attrId)
      return newSet
    })
  }

  const selectAttribute = (attr: AttributeDefinition) => {
    const existing = state.attributeSelections.find((s) => s.attribute_id === attr.id)
    if (existing) {
      updateAttributeSelections(
        state.attributeSelections.map((s) =>
          s.attribute_id === attr.id ? { ...s, value_ids: [], values: [] } : s
        )
      )
    } else {
      const newSelection: AttributeSelection = {
        attribute_id: attr.id,
        attribute_name: attr.name,
        attribute_code: attr.code,
        value_ids: [],
        values: [],
      }
      updateAttributeSelections([...state.attributeSelections, newSelection])
      setExpandedAttrs((prev) => new Set(prev).add(attr.id))
    }
  }

  const toggleValue = (attrId: string, valueId: string, value: AttributeValue) => {
    const selections = state.attributeSelections.map((sel) => {
      if (sel.attribute_id !== attrId) return sel
      const hasValue = sel.value_ids.includes(valueId)
      return {
        ...sel,
        value_ids: hasValue
          ? sel.value_ids.filter((id) => id !== valueId)
          : [...sel.value_ids, valueId],
        values: hasValue
          ? sel.values.filter((v) => v.id !== valueId)
          : [...sel.values, value],
      }
    })
    updateAttributeSelections(selections)
  }

  const toggleExpand = (attrId: string) => {
    setExpandedAttrs((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(attrId)) {
        newSet.delete(attrId)
      } else {
        newSet.add(attrId)
      }
      return newSet
    })
  }

  const handleNext = async () => {
    const productCode = state.basicInfo.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10) || "PRODUCT"
    await generateVariations(productCode)
    nextStep()
  }

  const selectedCount = state.attributeSelections.filter((s) => s.value_ids.length > 0).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Select Attributes</h2>
        <p className="text-muted-foreground">Choose attributes and their values for product variations</p>
      </div>

      {attributes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No attributes available. Please create attributes first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {attributes.map((attr) => {
            const selection = state.attributeSelections.find((s) => s.attribute_id === attr.id)
            const isSelected = !!selection
            const isExpanded = expandedAttrs.has(attr.id)
            const selectedValuesCount = selection?.value_ids.length || 0

            return (
              <Card key={attr.id} className={isSelected ? "border-primary" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => selectAttribute(attr)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{attr.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {attr.code}
                        </Badge>
                        {attr.is_required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{attr.description || `Type: ${attr.type}`}</CardDescription>
                    </div>
                    {isSelected && attr.values && attr.values.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(attr.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {isSelected && attr.values && attr.values.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="rounded-md border bg-muted/50 p-4">
                      <Label className="text-sm font-medium mb-2 block">
                        Select values ({selectedValuesCount} selected)
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {attr.values.map((value) => {
                          const isValueSelected = selection?.value_ids.includes(value.id)
                          return (
                            <Badge
                              key={value.id}
                              variant={isValueSelected ? "default" : "outline"}
                              className="cursor-pointer px-3 py-1"
                              onClick={() => toggleValue(attr.id, value.id, value)}
                              style={
                                value.swatch_color
                                  ? { backgroundColor: value.swatch_color, color: "#fff" }
                                  : undefined
                              }
                            >
                              {value.value}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={selectedCount === 0}>
          Next: Review Variations ({state.attributeSelections.length} attributes)
        </Button>
      </div>
    </div>
  )
}

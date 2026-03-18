"use client"

import React, { useState } from "react"
import { useWizard } from "./WizardContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Check, AlertCircle } from "lucide-react"

export function ReviewStep() {
  const { state, prevStep, submitProduct, resetWizard } = useWizard()
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setResult(null)
    const res = await submitProduct()
    setResult(res)
    setSubmitting(false)
  }

  const handleDone = () => {
    resetWizard()
    window.location.href = "/admin/products"
  }

  const totalStock = state.variations.reduce((sum, v) => sum + v.stock, 0)
  const activeVariations = state.variations.filter((v) => v.is_active !== false).length
  const primaryImage = state.images.find((img) => img.is_primary)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Review & Submit</h2>
        <p className="text-muted-foreground">Review your product before creating</p>
      </div>

      {result && (
        <Card className={result.success ? "border-green-500" : "border-destructive"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {result.success ? (
                <>
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-600">Product Created Successfully!</h3>
                    <p className="text-sm text-muted-foreground">
                      Your product has been created and is now available.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-destructive">Failed to Create Product</h3>
                    <p className="text-sm text-muted-foreground">{result.error}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{state.basicInfo.name}</span>
            </div>
            {state.basicInfo.brand_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brand</span>
                <span className="font-medium">{state.basicInfo.brand_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium">${state.basicInfo.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stock</span>
              <span className="font-medium">{totalStock > 0 ? totalStock : state.basicInfo.stock}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium">{state.basicInfo.discount}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={state.basicInfo.status === "active" ? "default" : "secondary"}>
                {state.basicInfo.status}
              </Badge>
            </div>
            {state.basicInfo.description && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground text-sm">Description</span>
                  <p className="text-sm mt-1">{state.basicInfo.description}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attributes</CardTitle>
            <CardDescription>
              {state.attributeSelections.length} attribute(s) selected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.attributeSelections.map((sel) => (
              <div key={sel.attribute_id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{sel.attribute_name}</span>
                <Badge variant="outline">{sel.values.length} values</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variations</CardTitle>
            <CardDescription>
              {activeVariations} active / {state.variations.length} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state.variations.length > 0 ? (
              <div className="space-y-2">
                {state.variations.slice(0, 5).map((v, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="font-mono text-xs">{v.sku}</span>
                    <span className="text-muted-foreground">
                      ${v.price.toFixed(2)} / {v.stock}
                    </span>
                  </div>
                ))}
                {state.variations.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{state.variations.length - 5} more variations
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No variations</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>
              {state.images.length} image(s) uploaded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {primaryImage ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded overflow-hidden bg-muted">
                  <img
                    src={primaryImage.image_url}
                    alt="Primary"
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.png"
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">Primary image set</span>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No images uploaded</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep} disabled={submitting}>
          Back
        </Button>
        {result?.success ? (
          <Button onClick={handleDone}>Done</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Product
          </Button>
        )}
      </div>
    </div>
  )
}

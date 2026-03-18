"use client"

import React, { useState, useEffect } from "react"
import { useWizard } from "./WizardContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { productAPI } from "@/lib/product-api"
import { Category, Brand } from "@/types/product-wizard"
import { Loader2, Plus } from "lucide-react"

export function BasicInfoStep() {
  const { state, updateBasicInfo, nextStep } = useWizard()
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [showBrandDialog, setShowBrandDialog] = useState(false)
  const [newBrand, setNewBrand] = useState({ name: "", description: "", tier: "standard" })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catResponse, brandResponse] = await Promise.all([
          productAPI.getCategoriesTree(),
          productAPI.getBrands({ status: "active" }),
        ])
        setCategories(catResponse.data.categories || [])
        setBrands(brandResponse.data.brands || [])
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const flattenCategories = (cats: Category[], level = 0): { id: string; name: string; level: number }[] => {
    const result: { id: string; name: string; level: number }[] = []
    for (const cat of cats) {
      result.push({ id: cat.id, name: cat.name, level })
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, level + 1))
      }
    }
    return result
  }

  const flatCategories = flattenCategories(categories)

  const handleCreateBrand = async () => {
    if (!newBrand.name.trim()) return
    
    try {
      const response = await productAPI.createBrand({
        name: newBrand.name,
        description: newBrand.description,
        tier: newBrand.tier,
      })
      
      const createdBrand = response.data.brand
      setBrands([...brands, createdBrand])
      updateBasicInfo({
        brand_id: createdBrand.id,
        brand_code: createdBrand.brand_code,
        brand_name: createdBrand.name,
      })
      setShowBrandDialog(false)
      setNewBrand({ name: "", description: "", tier: "standard" })
    } catch (error) {
      console.error("Failed to create brand:", error)
    }
  }

  const handleBrandSelect = (brandId: string) => {
    const selectedBrand = brands.find(b => b.id === brandId)
    if (selectedBrand) {
      updateBasicInfo({
        brand_id: selectedBrand.id,
        brand_code: selectedBrand.brand_code || "",
        brand_name: selectedBrand.name,
      })
    }
  }

  const isValid = state.basicInfo.name.trim() !== "" && state.basicInfo.price > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Basic Information</h2>
        <p className="text-muted-foreground">Enter the basic details for your product</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>The fundamental information about your product</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              placeholder="Enter product name"
              value={state.basicInfo.name}
              onChange={(e) => updateBasicInfo({ name: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="brand">Brand</Label>
            <div className="flex gap-2">
              <Select
                value={state.basicInfo.brand_id}
                onValueChange={handleBrandSelect}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={showBrandDialog} onOpenChange={setShowBrandDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Brand</DialogTitle>
                    <DialogDescription>
                      Add a new brand for your products
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="brandName">Brand Name *</Label>
                      <Input
                        id="brandName"
                        value={newBrand.name}
                        onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                        placeholder="e.g., Velocity"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="brandDesc">Description</Label>
                      <Textarea
                        id="brandDesc"
                        value={newBrand.description}
                        onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
                        placeholder="Brief brand description"
                        rows={2}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="brandTier">Tier</Label>
                      <Select
                        value={newBrand.tier}
                        onValueChange={(v) => setNewBrand({ ...newBrand, tier: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="budget">Budget</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="mid-range">Mid-range</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="luxury">Luxury</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowBrandDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateBrand} disabled={!newBrand.name.trim()}>
                      Create Brand
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter product description"
              rows={4}
              value={state.basicInfo.description}
              onChange={(e) => updateBasicInfo({ description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={state.basicInfo.price || ""}
                onChange={(e) => updateBasicInfo({ price: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                placeholder="0"
                value={state.basicInfo.stock || ""}
                onChange={(e) => updateBasicInfo({ stock: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={state.basicInfo.discount || ""}
                onChange={(e) => updateBasicInfo({ discount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={state.basicInfo.status}
                onValueChange={(value) => updateBasicInfo({ status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading categories...</span>
              </div>
            ) : (
              <Select
                value={state.basicInfo.category_id}
                onValueChange={(value) => updateBasicInfo({ category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {flatCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.level > 0 && "\u00A0\u00A0".repeat(cat.level)}
                      {cat.level > 0 && "→ "}
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={nextStep} disabled={!isValid}>
          Next: Select Attributes
        </Button>
      </div>
    </div>
  )
}

"use client"

import React, { useState, useRef } from "react"
import { useWizard } from "./WizardContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProductImage } from "@/types/product-wizard"
import { Upload, X, Star, GripVertical, Image as ImageIcon } from "lucide-react"

export function ImagesStep() {
  const { state, updateImages, nextStep, prevStep } = useWizard()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

      const newImages: ProductImage[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const url = URL.createObjectURL(file)
        newImages.push({
          image_url: url,
          is_primary: state.images.length === 0 && i === 0,
          sort_order: state.images.length + i,
        })
      }

    updateImages([...state.images, ...newImages])
    setUploading(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeImage = (index: number) => {
    const newImages = state.images.filter((_, i) => i !== index)
    if (state.images[index]?.is_primary && newImages.length > 0) {
      newImages[0].is_primary = true
    }
    updateImages(newImages)
  }

  const setPrimary = (index: number) => {
    const newImages = state.images.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }))
    updateImages(newImages)
  }

  const handleUrlAdd = () => {
    const url = prompt("Enter image URL:")
    if (url) {
      const newImages: ProductImage[] = [
        ...state.images,
        {
          image_url: url,
          is_primary: state.images.length === 0,
          sort_order: state.images.length,
        },
      ]
      updateImages(newImages)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Product Images</h2>
        <p className="text-muted-foreground">Upload images for your product</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Images</CardTitle>
          <CardDescription>Add product images. The first image will be the primary image.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
            <Button variant="outline" onClick={handleUrlAdd}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Add URL
            </Button>
          </div>

          {uploading && (
            <p className="text-sm text-muted-foreground">Uploading images...</p>
          )}
        </CardContent>
      </Card>

      {state.images.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No images uploaded yet</p>
            <p className="text-sm text-muted-foreground">You can skip this step and add images later</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {state.images.map((image, index) => (
            <Card
              key={index}
              className={`overflow-hidden ${image.is_primary ? "ring-2 ring-primary" : ""}`}
            >
              <div className="aspect-square relative bg-muted">
                <img
                  src={image.image_url}
                  alt={`Product image ${index + 1}`}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.png"
                  }}
                />
                {image.is_primary && (
                  <Badge className="absolute top-2 left-2" variant="default">
                    <Star className="h-3 w-3 mr-1" />
                    Primary
                  </Badge>
                )}
              </div>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  <div className="flex gap-1">
                    {!image.is_primary && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => setPrimary(index)}
                        title="Set as primary"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={nextStep}>
          Next: Review
        </Button>
      </div>
    </div>
  )
}

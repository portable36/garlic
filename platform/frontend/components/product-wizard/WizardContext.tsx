"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { WizardState, WizardStep, AttributeSelection, ProductVariation, ProductImage } from "@/types/product-wizard"
import { productAPI } from "@/lib/product-api"

interface WizardContextType {
  state: WizardState
  setStep: (step: WizardStep) => void
  nextStep: () => void
  prevStep: () => void
  updateBasicInfo: (data: Partial<WizardState["basicInfo"]>) => void
  updateAttributeSelections: (selections: AttributeSelection[]) => void
  updateVariations: (variations: ProductVariation[]) => void
  updateImages: (images: ProductImage[]) => void
  generateVariations: (productCode: string) => Promise<void>
  submitProduct: () => Promise<{ success: boolean; error?: string }>
  resetWizard: () => void
}

const initialState: WizardState = {
  currentStep: "basic",
  basicInfo: {
    name: "",
    description: "",
    price: 0,
    brand_id: "",
    brand_code: "",
    brand_name: "",
    category_id: "",
    stock: 0,
    discount: 0,
    status: "draft",
  },
  attributeSelections: [],
  variations: [],
  images: [],
}

const steps: WizardStep[] = ["basic", "attributes", "variations", "images", "review"]

const WizardContext = createContext<WizardContextType | undefined>(undefined)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState)

  const setStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, currentStep: step }))
  }, [])

  const nextStep = useCallback(() => {
    const currentIndex = steps.indexOf(state.currentStep)
    if (currentIndex < steps.length - 1) {
      setState((prev) => ({ ...prev, currentStep: steps[currentIndex + 1] }))
    }
  }, [state.currentStep])

  const prevStep = useCallback(() => {
    const currentIndex = steps.indexOf(state.currentStep)
    if (currentIndex > 0) {
      setState((prev) => ({ ...prev, currentStep: steps[currentIndex - 1] }))
    }
  }, [state.currentStep])

  const updateBasicInfo = useCallback((data: Partial<WizardState["basicInfo"]>) => {
    setState((prev) => ({
      ...prev,
      basicInfo: { ...prev.basicInfo, ...data },
    }))
  }, [])

  const updateAttributeSelections = useCallback((selections: AttributeSelection[]) => {
    setState((prev) => ({ ...prev, attributeSelections: selections }))
  }, [])

  const updateVariations = useCallback((variations: ProductVariation[]) => {
    setState((prev) => ({ ...prev, variations }))
  }, [])

  const updateImages = useCallback((images: ProductImage[]) => {
    setState((prev) => ({ ...prev, images }))
  }, [])

  const generateVariations = useCallback(async (productCode: string) => {
    if (state.attributeSelections.length === 0) {
      setState((prev) => ({ ...prev, variations: [] }))
      return
    }

    const selections = state.attributeSelections
      .filter((sel) => sel.value_ids.length > 0)
      .map((sel) => ({
        attribute_id: sel.attribute_id,
        value_ids: sel.value_ids,
      }))

    if (selections.length === 0) {
      setState((prev) => ({ ...prev, variations: [] }))
      return
    }

    try {
      const response = await productAPI.generateMatrix({
        product_code: productCode,
        brand_code: state.basicInfo.brand_code || "",
        selections,
      })

      const variationsWithBasePrice = response.data.variations.map((v: ProductVariation) => ({
        ...v,
        price: state.basicInfo.price,
        stock: state.basicInfo.stock,
      }))

      setState((prev) => ({ ...prev, variations: variationsWithBasePrice }))
    } catch (error) {
      console.error("Failed to generate variations:", error)
      setState((prev) => ({ ...prev, variations: [] }))
    }
  }, [state.attributeSelections, state.basicInfo.price, state.basicInfo.stock, state.basicInfo.brand_code])

  const submitProduct = useCallback(async () => {
    try {
      const productCode = state.basicInfo.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 10) || "PRODUCT"

      const variations = state.variations.map((v) => {
        const valueIds: string[] = []
        state.attributeSelections.forEach((sel) => {
          sel.values.forEach((val) => {
            const attrKey = sel.attribute_code
            if (v.attributes[attrKey] === val.code || v.attributes[attrKey] === val.value) {
              valueIds.push(val.id)
            }
          })
        })

        return {
          sku: v.sku,
          barcode: v.barcode || "",
          attribute_value_ids: valueIds,
          attributes: v.attributes,
          price: v.price || state.basicInfo.price,
          stock: v.stock || state.basicInfo.stock,
        }
      })

      const response = await productAPI.createProductV2({
        name: state.basicInfo.name,
        description: state.basicInfo.description,
        price: state.basicInfo.price,
        brand_id: state.basicInfo.brand_id || undefined,
        brand_code: state.basicInfo.brand_code || undefined,
        category_id: state.basicInfo.category_id || undefined,
        stock: state.basicInfo.stock,
        discount: state.basicInfo.discount,
        status: state.basicInfo.status,
        variations,
      })

      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Failed to create product",
      }
    }
  }, [state])

  const resetWizard = useCallback(() => {
    setState(initialState)
  }, [])

  return (
    <WizardContext.Provider
      value={{
        state,
        setStep,
        nextStep,
        prevStep,
        updateBasicInfo,
        updateAttributeSelections,
        updateVariations,
        updateImages,
        generateVariations,
        submitProduct,
        resetWizard,
      }}
    >
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const context = useContext(WizardContext)
  if (context === undefined) {
    throw new Error("useWizard must be used within a WizardProvider")
  }
  return context
}

export const stepLabels: Record<WizardStep, string> = {
  basic: "Basic Info",
  attributes: "Attributes",
  variations: "Variations",
  images: "Images",
  review: "Review",
}

export const stepOrder: WizardStep[] = steps

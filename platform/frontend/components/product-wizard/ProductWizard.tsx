"use client"

import React from "react"
import { WizardProvider, useWizard, stepLabels, stepOrder } from "./WizardContext"
import { BasicInfoStep } from "./BasicInfoStep"
import { AttributesStep } from "./AttributesStep"
import { VariationsStep } from "./VariationsStep"
import { ImagesStep } from "./ImagesStep"
import { ReviewStep } from "./ReviewStep"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

function WizardContent() {
  const { state, setStep } = useWizard()

  const renderStep = () => {
    switch (state.currentStep) {
      case "basic":
        return <BasicInfoStep />
      case "attributes":
        return <AttributesStep />
      case "variations":
        return <VariationsStep />
      case "images":
        return <ImagesStep />
      case "review":
        return <ReviewStep />
      default:
        return null
    }
  }

  const currentIndex = stepOrder.indexOf(state.currentStep)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          {stepOrder.map((step, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = step === state.currentStep

            return (
              <React.Fragment key={step}>
                <button
                  onClick={() => {
                    if (index <= currentIndex) {
                      setStep(step)
                    }
                  }}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </button>
                {index < stepOrder.length - 1 && (
                  <div
                    className={cn(
                      "w-12 h-0.5",
                      index < currentIndex ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
        {stepOrder.map((step, index) => (
          <span
            key={step}
            className={cn(
              step === state.currentStep && "text-foreground font-medium"
            )}
          >
            {stepLabels[step]}
          </span>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  )
}

export function ProductWizard() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  )
}

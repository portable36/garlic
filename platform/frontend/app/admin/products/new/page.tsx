"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { ProductWizard } from "@/components/product-wizard"

export default function NewProductPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      const roleId = Cookies.get("role_id")
      const isAdmin = roleId === "1" || roleId === "3" || roleId === "4"
      if (!Cookies.get("access_token") || !isAdmin) {
        router.push("/auth/login")
      }
    }
  }, [mounted, router])

  if (!mounted) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <ProductWizard />
    </div>
  )
}

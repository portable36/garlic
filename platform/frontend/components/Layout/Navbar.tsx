'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { authAPI, cartAPI } from '@/lib/api'

export default function Navbar() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: () => authAPI.me(),
    enabled: isLoggedIn,
  })

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartAPI.get(),
    enabled: isLoggedIn,
  })

  useEffect(() => {
    const token = Cookies.get('access_token')
    setIsLoggedIn(!!token)
    const roleId = Cookies.get('role_id')
    setIsAdmin(roleId === '1')
  }, [])

  const handleLogout = () => {
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    Cookies.remove('role_id')
    setIsLoggedIn(false)
    router.push('/auth/login')
  }

  const cartCount = cartData?.data?.cart?.items?.length || 0

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary-600">
              Shop
            </Link>
            <div className="hidden md:flex ml-10 space-x-8">
              <Link
                href="/products"
                className="text-gray-700 hover:text-primary-600"
              >
                Products
              </Link>
              {isAdmin && (
                <Link
                  href="/admin/products"
                  className="text-gray-700 hover:text-primary-600"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/cart" className="text-gray-700 hover:text-primary-600">
              <span className="sr-only">Cart</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -mt-8 ml-4 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            {isLoggedIn ? (
              <>
                <Link
                  href="/orders"
                  className="text-gray-700 hover:text-primary-600"
                >
                  Orders
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-primary-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-gray-700 hover:text-primary-600"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

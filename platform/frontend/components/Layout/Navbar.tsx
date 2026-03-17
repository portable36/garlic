'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import Cookies from 'js-cookie'
import { authAPI, cartAPI } from '@/lib/api'

const CATEGORIES = [
  { name: 'Electronics', icon: '📱', href: '/products?category=electronics' },
  { name: 'Fashion', icon: '👗', href: '/products?category=fashion' },
  { name: 'Home & Living', icon: '🏠', href: '/products?category=home' },
  { name: 'Beauty & Health', icon: '💄', href: '/products?category=beauty' },
  { name: 'Sports & Outdoors', icon: '⚽', href: '/products?category=sports' },
  { name: 'Books & Media', icon: '📚', href: '/products?category=books' },
  { name: 'Toys & Games', icon: '🎮', href: '/products?category=toys' },
  { name: 'Automotive', icon: '🚗', href: '/products?category=automotive' },
]

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const categoryRef = useRef<HTMLDivElement>(null)

  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: () => authAPI.me(),
    enabled: isLoggedIn,
  })

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartAPI.get(),
    retry: false,
  })

  const checkAuth = useCallback(() => {
    const token = Cookies.get('access_token')
    setIsLoggedIn(!!token)
    const roleId = Cookies.get('role_id')
    setIsAdmin(roleId === '1' || roleId === '3' || roleId === '4')
  }, [])

  useEffect(() => {
    checkAuth()
    const interval = setInterval(checkAuth, 2000)
    return () => clearInterval(interval)
  }, [checkAuth])

  useEffect(() => {
    if (userData?.data?.email) {
      setUserEmail(userData.data.email)
    }
  }, [userData])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    Cookies.remove('role_id')
    setIsLoggedIn(false)
    setShowDropdown(false)
    router.push('/auth/login')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase()
  }

  const cartCount = cartData?.data?.cart?.items?.length || 0

  // Hide navbar on admin pages
  if (pathname.startsWith('/admin')) {
    return null
  }

  return (
    <div className="sticky top-0 z-50">
      {/* Top Info Bar - Yellow Background */}
      <div className="bg-[#fcca19]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-10 text-sm">
            <div className="flex items-center space-x-6 text-[#2c2c2c]">
              <span className="flex items-center gap-1.5 cursor-pointer hover:opacity-80">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                +1 234 567 890
              </span>
              <span className="hidden md:flex items-center gap-1.5 cursor-pointer hover:opacity-80">
                <svg className="w-4 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                support@garlic.test
              </span>
            </div>
            <div className="flex items-center space-x-4 text-[#2c2c2c]">
              <Link href="/seller/signup" className="hidden md:flex items-center gap-1.5 hover:opacity-80 font-medium">
                <svg className="w-4 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
                Be a seller
              </Link>
              <Link href="/compare" className="hidden md:flex items-center gap-1.5 hover:opacity-80">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Compare
              </Link>
              <button className="flex items-center gap-1 hover:opacity-80">
                <span>৳ BDT</span>
              </button>
              <button className="flex items-center gap-1 hover:opacity-80">
                <span>English</span>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-[#fcca19]">Garlic</span>
            </Link>

            {/* Search Bar - Center */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-12 py-2.5 border-2 border-gray-200 rounded-l-md focus:outline-none focus:border-[#fcca19]"
                />
                <button
                  type="submit"
                  className="absolute right-0 top-0 h-full px-6 bg-[#fcca19] text-[#2c2c2c] font-medium rounded-r-md hover:bg-[#e6b617]"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Right Icons */}
            <div className="flex items-center space-x-4">
              {/* Account */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex flex-col items-center text-[#2c2c2c] hover:text-[#fcca19] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs mt-0.5">Account</span>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-md shadow-lg border py-1 z-50">
                    {isLoggedIn ? (
                      <>
                        <div className="px-4 py-3 border-b">
                          <p className="text-sm font-medium text-gray-900 truncate">{userEmail || 'User'}</p>
                          <p className="text-xs text-gray-500">{isAdmin ? 'Administrator' : 'Member'}</p>
                        </div>
                        {isAdmin && (
                          <Link
                            href="/admin/dashboard"
                            onClick={() => setShowDropdown(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Admin Dashboard
                          </Link>
                        )}
                        <Link
                          href="/orders"
                          onClick={() => setShowDropdown(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          My Orders
                        </Link>
                        <Link
                          href="/wishlist"
                          onClick={() => setShowDropdown(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Wishlist
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="px-4 py-3 border-b">
                          <p className="text-sm text-gray-500">Welcome to Garlic</p>
                        </div>
                        <Link
                          href="/auth/login"
                          onClick={() => setShowDropdown(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Login / Register
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Wishlist - Hidden on mobile */}
              <Link href="/wishlist" className="hidden md:flex flex-col items-center text-[#2c2c2c] hover:text-[#fcca19] transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-xs mt-0.5">Wishlist</span>
              </Link>

              {/* Cart */}
              <Link href="/cart" className="relative flex flex-col items-center text-[#2c2c2c] hover:text-[#fcca19] transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {cartCount}
                  </span>
                )}
                <span className="text-xs mt-0.5">Cart</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="bg-white border-t" ref={categoryRef}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center">
            {/* All Categories Button */}
            <div className="relative">
              <button
                onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                className="flex items-center gap-2 px-4 py-3 bg-[#fcca19] text-[#2c2c2c] font-medium hover:bg-[#e6b617]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                All Categories
              </button>

              {showCategoryMenu && (
                <div className="absolute left-0 top-full w-64 bg-white border shadow-lg z-50">
                  {CATEGORIES.map((category, index) => (
                    <Link
                      key={index}
                      href={category.href}
                      onClick={() => setShowCategoryMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 border-b last:border-b-0"
                    >
                      <span>{category.icon}</span>
                      {category.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Main Links */}
            <div className="flex items-center ml-4 space-x-1">
              <Link 
                href="/" 
                className={`px-4 py-3 text-sm font-medium hover:text-[#fcca19] transition-colors ${pathname === '/' ? 'text-[#fcca19]' : 'text-[#2c2c2c]'}`}
              >
                Home
              </Link>
              <Link 
                href="/products" 
                className={`px-4 py-3 text-sm font-medium hover:text-[#fcca19] transition-colors ${pathname === '/products' ? 'text-[#fcca19]' : 'text-[#2c2c2c]'}`}
              >
                Shop
              </Link>
              <Link 
                href="/orders" 
                className={`px-4 py-3 text-sm font-medium hover:text-[#fcca19] transition-colors ${pathname === '/orders' ? 'text-[#fcca19]' : 'text-[#2c2c2c]'}`}
              >
                Track Order
              </Link>
              <div className="relative group">
                <button className="px-4 py-3 text-sm font-medium text-[#2c2c2c] hover:text-[#fcca19] transition-colors flex items-center gap-1">
                  More
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="absolute left-0 top-full w-48 bg-white border shadow-lg py-1 z-50 hidden group-hover:block">
                  <Link href="/about" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    About Us
                  </Link>
                  <Link href="/contact" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Contact Us
                  </Link>
                  <Link href="/coupons" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Coupons
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search - Visible only on mobile */}
      <div className="md:hidden bg-white border-b px-4 py-3">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-2 border-2 border-gray-200 rounded-md focus:outline-none focus:border-[#fcca19]"
            />
            <button
              type="submit"
              className="absolute right-0 top-0 h-full px-4 bg-[#fcca19] text-[#2c2c2c] rounded-r-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute left-0 top-0 w-72 bg-white h-full shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <span className="text-xl font-bold text-[#fcca19]">Garlic</span>
              <button onClick={() => setShowMobileMenu(false)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {isLoggedIn ? (
                <div className="border-b pb-4 mb-4">
                  <p className="font-medium">{userEmail || 'User'}</p>
                  <p className="text-sm text-gray-500">{isAdmin ? 'Administrator' : 'Member'}</p>
                </div>
              ) : (
                <Link 
                  href="/auth/login" 
                  onClick={() => setShowMobileMenu(false)}
                  className="block py-2 text-[#fcca19] font-medium"
                >
                  Login / Register
                </Link>
              )}
              <Link href="/" onClick={() => setShowMobileMenu(false)} className="block py-2">Home</Link>
              <Link href="/products" onClick={() => setShowMobileMenu(false)} className="block py-2">Products</Link>
              <Link href="/orders" onClick={() => setShowMobileMenu(false)} className="block py-2">Track Order</Link>
              <Link href="/cart" onClick={() => setShowMobileMenu(false)} className="block py-2">Cart</Link>
              {isAdmin && (
                <Link href="/admin/dashboard" onClick={() => setShowMobileMenu(false)} className="block py-2 text-[#fcca19] font-medium">
                  Admin Dashboard
                </Link>
              )}
              {isLoggedIn && (
                <button onClick={handleLogout} className="block py-2 text-red-600">Logout</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

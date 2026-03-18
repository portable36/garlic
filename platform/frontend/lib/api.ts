import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost'

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || `${API_URL}/auth`
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || `${API_URL}/admin`
const PRODUCTS_URL = process.env.NEXT_PUBLIC_PRODUCTS_URL || `${API_URL}/api`
const CART_URL = process.env.NEXT_PUBLIC_CART_URL || `${API_URL}/cart`
const ORDERS_URL = process.env.NEXT_PUBLIC_ORDERS_URL || `${API_URL}/orders`

const createApiClient = (baseURL: string) => {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  client.interceptors.request.use((config) => {
    const token = Cookies.get('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  return client
}

const authApi = createApiClient(AUTH_URL)
const adminApi = createApiClient(ADMIN_URL)
const productsApi = createApiClient(PRODUCTS_URL)
const cartApi = createApiClient(CART_URL)
const ordersApi = createApiClient(ORDERS_URL)

export const authAPI = {
  register: (data: { email: string; password: string }) =>
    authApi.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    authApi.post('/auth/login', data),
  me: () => authApi.get('/auth/me'),
  refresh: (refreshToken: string) =>
    authApi.post('/auth/refresh', { refresh_token: refreshToken }),
}

export const productsAPI = {
  list: (params?: { page?: number; page_size?: number }) =>
    productsApi.get('/products', { params }),
  get: (id: string) => productsApi.get(`/products/${id}`),
  create: (data: any) => productsApi.post('/products', data),
  update: (id: string, data: any) => productsApi.put(`/products/${id}`, data),
  delete: (id: string) => productsApi.delete(`/products/${id}`),
  uploadImage: (id: string, formData: FormData) =>
    productsApi.post(`/products/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getCategories: () => productsApi.get('/products/categories'),
  
  // Variations (separate endpoints)
  addVariation: (productId: string, data: any) =>
    productsApi.post(`/products/${productId}/variations`, data),
  updateVariation: (productId: string, variationId: string, data: any) =>
    productsApi.put(`/products/${productId}/variations/${variationId}`, data),
  deleteVariation: (productId: string, variationId: string) =>
    productsApi.delete(`/products/${productId}/variations/${variationId}`),
  
  // SKU/Barcode generation
  generateSKU: (data: { prefix?: string; suffix?: string; strategy?: string; category_id?: string }) =>
    productsApi.post('/products/generate-sku', data),
  generateBarcode: (data: { prefix?: string; suffix?: string; format?: string }) =>
    productsApi.post('/products/generate-barcode', data),
}

export const cartAPI = {
  get: () => cartApi.get('/cart'),
  add: (data: { product_id: string; quantity: number }) =>
    cartApi.post('/cart/add', data),
  update: (data: { product_id: string; quantity: number }) =>
    cartApi.put('/cart/update', data),
  remove: (productId: string) => cartApi.delete(`/cart/remove/${productId}`),
  clear: () => cartApi.delete('/cart/clear'),
}

export const ordersAPI = {
  create: (data: { shipping_address: string; payment_method: string }) =>
    ordersApi.post('/orders', data),
  list: () => ordersApi.get('/orders'),
  get: (id: string) => ordersApi.get(`/orders/${id}`),
}

export const settingsAPI = {
  list: (group?: string) => 
    adminApi.get('/settings', { params: { group } }),
  get: (key: string) => 
    adminApi.get(`/settings/${key}`),
  update: (key: string, value: string, type?: string) =>
    adminApi.put('/settings', { key, value, type }),
  updateBatch: (settings: Record<string, string>) =>
    adminApi.put('/settings/batch', { settings }),
}

export default { authAPI, productsAPI, cartAPI, ordersAPI, settingsAPI }

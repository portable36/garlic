import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost'

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || `${API_URL}/auth`
const PRODUCTS_URL = process.env.NEXT_PUBLIC_PRODUCTS_URL || `${API_URL}/products`
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
    productsApi.post(`/products/${id}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getCategories: () => productsApi.get('/products/categories'),
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

export default { authAPI, productsAPI, cartAPI, ordersAPI }

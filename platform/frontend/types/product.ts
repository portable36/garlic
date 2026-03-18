export interface Product {
  id: string
  name: string
  description: string
  price: number
  category_id?: string
  category?: Category
  vendor_id?: string
  stock: number
  discount: number
  status: 'draft' | 'active' | 'hidden'
  is_active: boolean
  variations: ProductVariation[]
  images: ProductImage[]
  created_at: string
  updated_at: string
}

export interface ProductVariation {
  id: string
  product_id: string
  sku: string
  barcode?: string
  attributes: Record<string, string>
  price: number
  stock: number
  is_active: boolean
  created_at?: string
}

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  is_primary: boolean
  sort_order: number
  created_at: string
}

export interface Category {
  id: string
  name: string
  description?: string
  parent_id?: string
}

export interface CreateProductRequest {
  name: string
  description?: string
  price: number
  category_id?: string
  vendor_id?: string
  stock?: number
  discount?: number
  status?: 'draft' | 'active'
  variations?: CreateVariationRequest[]
}

export interface CreateVariationRequest {
  sku?: string
  barcode?: string
  attributes?: Record<string, string>
  price?: number
  stock?: number
}

export interface UpdateVariationRequest {
  sku?: string
  barcode?: string
  attributes?: Record<string, string>
  price?: number
  stock?: number
  is_active?: boolean
}

export interface SKUGenerationRequest {
  prefix?: string
  suffix?: string
  strategy?: 'random' | 'incremental' | 'timestamp'
  category_id?: string
}

export interface BarcodeGenerationRequest {
  prefix?: string
  suffix?: string
  format?: 'ean13' | 'code128' | 'qr'
}

export interface SKUGenerationResponse {
  sku: string
}

export interface BarcodeGenerationResponse {
  barcode: string
  format: string
  image: string // base64
}

export interface ProductsListResponse {
  products: Product[]
  total_count: number
  page: number
  page_size: number
}

export interface ProductResponse {
  product: Product
}

export interface CategoriesResponse {
  categories: Category[]
}

export interface VariationResponse {
  variation: ProductVariation
}

export interface ImageResponse {
  image: ProductImage
}

export interface ApiError {
  error: string
}

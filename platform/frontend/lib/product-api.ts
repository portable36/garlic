import axios from "axios"
import Cookies from "js-cookie"
import { AttributeDefinition, AttributeValue, SKUSuffixRule, Category, ProductVariation, Brand } from "@/types/product-wizard"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082"

const api = axios.create({
  baseURL: `${API_URL}/products`,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface GenerateMatrixRequest {
  product_code: string;
  brand_code?: string;
  prefix?: string;
  suffix?: string;
  category_id?: string;
  selections: {
    attribute_id: string;
    value_ids: string[];
  }[];
}

export interface GenerateSKURequest {
  product_code: string;
  prefix?: string;
  suffix?: string;
  attribute_codes?: string[];
  category_id?: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  category_id?: string;
  stock: number;
  discount: number;
  status: string;
  variations: {
    sku: string;
    barcode?: string;
    attributes: Record<string, string>;
    price: number;
    stock: number;
  }[];
}

export interface CreateAttributeRequest {
  name: string;
  code: string;
  description?: string;
  type?: string;
  is_required?: boolean;
  is_filterable?: boolean;
  is_searchable?: boolean;
  display_order?: number;
}

export interface CreateAttributeValueRequest {
  attribute_id: string;
  value: string;
  code: string;
  swatch_color?: string;
  swatch_image?: string;
  display_order?: number;
}

export interface CreateBrandRequest {
  name: string;
  logo_url?: string;
  description?: string;
  tier?: string;
}

export interface CreateProductV2Request {
  name: string;
  description: string;
  price: number;
  brand_id?: string;
  brand_code?: string;
  category_id?: string;
  stock: number;
  discount: number;
  status: string;
  variations: {
    sku: string;
    barcode?: string;
    attribute_value_ids: string[];
    attributes: Record<string, string>;
    price: number;
    stock: number;
  }[];
}

export interface GenerateSKURequestV3 {
  brand_code: string;
  product_code: string;
  attribute_codes?: string[];
  suffix?: string;
}

export const productAPI = {
  // Products
  getProducts: (params?: { page?: number; page_size?: number; search?: string; status?: string }) =>
    api.get("", { params }),
  getProduct: (id: string) => api.get(`/${id}`),
  createProduct: (data: CreateProductRequest) => api.post("", data),
  updateProduct: (id: string, data: Partial<CreateProductRequest>) => api.put(`/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/${id}`),

  // Categories
  getCategories: () => api.get<{ categories: Category[] }>("/categories"),
  getCategoriesTree: () => api.get<{ categories: Category[] }>("/categories/tree"),

  // Attributes
  getAttributes: () => api.get<{ attributes: AttributeDefinition[] }>("/attributes"),
  getAttribute: (id: string) => api.get<{ attribute: AttributeDefinition }>(`/attributes/${id}`),
  createAttribute: (data: CreateAttributeRequest) => api.post<{ attribute: AttributeDefinition }>("/attributes", data),
  updateAttribute: (id: string, data: Partial<CreateAttributeRequest>) => api.put<{ attribute: AttributeDefinition }>(`/attributes/${id}`, data),
  deleteAttribute: (id: string) => api.delete(`/attributes/${id}`),

  // Attribute Values
  getAttributeValues: (attributeId: string) =>
    api.get<{ values: AttributeValue[] }>("/attribute-values", { params: { attribute_id: attributeId } }),
  createAttributeValue: (data: CreateAttributeValueRequest) =>
    api.post<{ value: AttributeValue }>("/attribute-values", data),
  updateAttributeValue: (id: string, data: Partial<CreateAttributeValueRequest>) =>
    api.put<{ value: AttributeValue }>(`/attribute-values/${id}`, data),
  deleteAttributeValue: (id: string) => api.delete(`/attribute-values/${id}`),

  // SKU Generation
  generateSKU: (data: GenerateSKURequest) => api.post<{ sku: string }>("/generate-sku-v2", data),
  generateMatrix: (data: GenerateMatrixRequest) =>
    api.post<{ variations: ProductVariation[]; count: number }>("/generate-matrix", data),

  // SKU Suffix Rules
  getSKUSuffixRules: () => api.get<{ rules: SKUSuffixRule[] }>("/sku-suffix-rules"),

  // Brands
  getBrands: (params?: { status?: string }) => api.get<{ brands: Brand[] }>("/brands", { params }),
  getBrand: (id: string) => api.get<{ brand: Brand }>(`/brands/${id}`),
  createBrand: (data: CreateBrandRequest) => api.post<{ brand: Brand }>("/brands", data),
  updateBrand: (id: string, data: Partial<CreateBrandRequest>) => api.put<{ brand: Brand }>(`/brands/${id}`, data),
  deleteBrand: (id: string) => api.delete(`/brands/${id}`),

  // Product V2 (with transactional variations)
  createProductV2: (data: CreateProductV2Request) => api.post("/v2", data),

  // SKU V3 (with brand code)
  generateSKUv3: (data: GenerateSKURequestV3) => api.post<{ sku: string }>("/generate-sku-v3", data),
}

export default api

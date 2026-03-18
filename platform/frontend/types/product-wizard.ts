export interface AttributeDefinition {
  id: string;
  name: string;
  code: string;
  description?: string;
  type: string;
  is_required: boolean;
  is_filterable: boolean;
  is_searchable: boolean;
  display_order: number;
  is_active: boolean;
  values?: AttributeValue[];
}

export interface AttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  code: string;
  swatch_color?: string;
  swatch_image?: string;
  display_order: number;
  is_active: boolean;
}

export interface SKUSuffixRule {
  id: string;
  name: string;
  code: string;
  suffix: string;
  description?: string;
  valid_from?: string;
  valid_to?: string;
  is_system: boolean;
  is_active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  brand_code?: string;
  logo_url?: string;
  description?: string;
  tier: 'luxury' | 'premium' | 'standard' | 'budget';
  status: 'active' | 'inactive' | 'pending';
  created_by?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  children?: Category[];
}

export interface ProductVariation {
  id?: string;
  sku: string;
  barcode?: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
  is_active?: boolean;
}

export interface ProductImage {
  id?: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface AttributeSelection {
  attribute_id: string;
  attribute_name: string;
  attribute_code: string;
  value_ids: string[];
  values: AttributeValue[];
}

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  brand_id?: string;
  brand_code?: string;
  category_id?: string;
  stock: number;
  discount: number;
  status: string;
  variations: ProductVariation[];
  images: ProductImage[];
}

export type WizardStep = 'basic' | 'attributes' | 'variations' | 'images' | 'review';

export interface WizardState {
  currentStep: WizardStep;
  basicInfo: {
    name: string;
    description: string;
    price: number;
    brand_id?: string;
    brand_code?: string;
    brand_name?: string;
    category_id?: string;
    stock: number;
    discount: number;
    status: string;
  };
  attributeSelections: AttributeSelection[];
  variations: ProductVariation[];
  images: ProductImage[];
}

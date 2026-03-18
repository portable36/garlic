-- Brands and Product Variations Extension
-- Migration: 08-brands-extensions.sql

-- 1. Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    brand_code VARCHAR(20),
    logo_url TEXT,
    description TEXT,
    tier VARCHAR(20) DEFAULT 'standard',
    status VARCHAR(20) DEFAULT 'active',
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add brand columns to products (nullable for backward compatibility)
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_code VARCHAR(20);

-- 3. Pivot table for variation ↔ attribute values (for queryability)
CREATE TABLE IF NOT EXISTS product_variation_attribute_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variation_id UUID NOT NULL REFERENCES product_variations(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES attribute_definitions(id),
    attribute_value_id UUID NOT NULL REFERENCES attribute_values(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(variation_id, attribute_id, attribute_value_id)
);

-- 4. Variation-level images support
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES product_variations(id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_status ON brands(status);
CREATE INDEX IF NOT EXISTS idx_variation_attribute_values_variation_id ON product_variation_attribute_values(variation_id);
CREATE INDEX IF NOT EXISTS idx_variation_attribute_values_attr_id ON product_variation_attribute_values(attribute_id);
CREATE INDEX IF NOT EXISTS idx_variation_attribute_values_attr_value_id ON product_variation_attribute_values(attribute_value_id);
CREATE INDEX IF NOT EXISTS idx_product_images_variation_id ON product_images(variation_id);

-- 6. Insert sample brands
INSERT INTO brands (name, slug, brand_code, description, tier, status) VALUES
    ('Velocity', 'velocity', 'VEL', 'High-performance minimalist fashion for modern lifestyles', 'premium', 'active'),
    ('UrbanEdge', 'urbanedge', 'UEG', 'Contemporary streetwear with bold designs', 'mid-range', 'active'),
    ('PureNest', 'purenest', 'PNT', 'Sustainable home essentials for conscious living', 'premium', 'active'),
    ('TechNova', 'technova', 'TNV', 'Next-generation electronics and smart devices', 'premium', 'active'),
    ('GlowBerry', 'glowberry', 'GLB', 'Natural beauty and skincare powered by superfruits', 'mid-range', 'active')
ON CONFLICT (slug) DO NOTHING;

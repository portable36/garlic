-- Product Variations Migration
-- Phase 1: Core - Product with Variations Support

-- Create admin_db if not exists
SELECT 'CREATE DATABASE admin_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'admin_db')\gexec

\c admin_db

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table updates
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount DECIMAL(5,2) DEFAULT 0;

-- Product variations table
CREATE TABLE IF NOT EXISTS product_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(50) UNIQUE,
    barcode VARCHAR(50) UNIQUE,
    attributes JSONB DEFAULT '{}',
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_variations_product_id ON product_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_variations_sku ON product_variations(sku);
CREATE INDEX IF NOT EXISTS idx_variations_barcode ON product_variations(barcode);

-- Product images table updates
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES product_variations(id) ON DELETE SET NULL;

-- Insert default SKU/Barcode settings if not exist
INSERT INTO admin_db.settings (setting_key, setting_value, setting_type, setting_group, is_public, created_at, updated_at)
SELECT 'sku_prefix', 'PRD', 'string', 'product', false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_db.settings WHERE setting_key = 'sku_prefix');

INSERT INTO admin_db.settings (setting_key, setting_value, setting_type, setting_group, is_public, created_at, updated_at)
SELECT 'sku_suffix', '', 'string', 'product', false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_db.settings WHERE setting_key = 'sku_suffix');

INSERT INTO admin_db.settings (setting_key, setting_value, setting_type, setting_group, is_public, created_at, updated_at)
SELECT 'sku_strategy', 'incremental', 'string', 'product', false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_db.settings WHERE setting_key = 'sku_strategy');

INSERT INTO admin_db.settings (setting_key, setting_value, setting_type, setting_group, is_public, created_at, updated_at)
SELECT 'sku_category_code', 'true', 'boolean', 'product', false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_db.settings WHERE setting_key = 'sku_category_code');

INSERT INTO admin_db.settings (setting_key, setting_value, setting_type, setting_group, is_public, created_at, updated_at)
SELECT 'barcode_prefix', '200', 'string', 'product', false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_db.settings WHERE setting_key = 'barcode_prefix');

INSERT INTO admin_db.settings (setting_key, setting_value, setting_type, setting_group, is_public, created_at, updated_at)
SELECT 'barcode_suffix', '', 'string', 'product', false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_db.settings WHERE setting_key = 'barcode_suffix');

INSERT INTO admin_db.settings (setting_key, setting_value, setting_type, setting_group, is_public, created_at, updated_at)
SELECT 'barcode_format', 'ean13', 'string', 'product', false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_db.settings WHERE setting_key = 'barcode_format');

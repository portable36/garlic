-- Global Attribute Definitions Table
CREATE TABLE IF NOT EXISTS attribute_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Predefined Values for Attributes
CREATE TABLE IF NOT EXISTS attribute_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attribute_id UUID NOT NULL REFERENCES attribute_definitions(id) ON DELETE CASCADE,
    value VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(attribute_id, value)
);

-- SKU Suffix Rules
CREATE TABLE IF NOT EXISTS sku_suffix_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Product Attribute Selections (links products to attribute values used)
CREATE TABLE IF NOT EXISTS product_attribute_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES attribute_definitions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, attribute_id)
);

-- Product Attribute Selection Values (specific values selected)
CREATE TABLE IF NOT EXISTS product_attribute_selection_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    selection_id UUID NOT NULL REFERENCES product_attribute_selections(id) ON DELETE CASCADE,
    attribute_value_id UUID NOT NULL REFERENCES attribute_values(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(selection_id, attribute_value_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attribute_values_attribute_id ON attribute_values(attribute_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_selections_product_id ON product_attribute_selections(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_selection_values_selection_id ON product_attribute_selection_values(selection_id);

-- Insert default attributes with values
INSERT INTO attribute_definitions (id, name, code, description, is_required, is_active) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Color', 'COLOR', 'Product color variants', true, true),
    ('00000000-0000-0000-0000-000000000002', 'Size', 'SIZE', 'Product size variants', true, true),
    ('00000000-0000-0000-0000-000000000003', 'Material', 'MATERIAL', 'Product material variants', false, true),
    ('00000000-0000-0000-0000-000000000004', 'Pattern', 'PATTERN', 'Product pattern variants', false, true),
    ('00000000-0000-0000-0000-000000000005', 'Fit', 'FIT', 'Product fit variants', false, true)
ON CONFLICT (name) DO NOTHING;

-- Insert default values for Color
INSERT INTO attribute_values (attribute_id, value, code, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Red', 'RD', 1),
    ('00000000-0000-0000-0000-000000000001', 'Blue', 'BL', 2),
    ('00000000-0000-0000-0000-000000000001', 'Green', 'GN', 3),
    ('00000000-0000-0000-0000-000000000001', 'Black', 'BK', 4),
    ('00000000-0000-0000-0000-000000000001', 'White', 'WH', 5),
    ('00000000-0000-0000-0000-000000000001', 'Yellow', 'YL', 6),
    ('00000000-0000-0000-0000-000000000001', 'Orange', 'OR', 7),
    ('00000000-0000-0000-0000-000000000001', 'Purple', 'PL', 8),
    ('00000000-0000-0000-0000-000000000001', 'Gray', 'GY', 9),
    ('00000000-0000-0000-0000-000000000001', 'Pink', 'PK', 10),
    ('00000000-0000-0000-0000-000000000001', 'Brown', 'BN', 11),
    ('00000000-0000-0000-0000-000000000001', 'Navy', 'NV', 12)
ON CONFLICT (attribute_id, value) DO NOTHING;

-- Insert default values for Size
INSERT INTO attribute_values (attribute_id, value, code, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000002', 'XS', 'XS', 1),
    ('00000000-0000-0000-0000-000000000002', 'S', 'S', 2),
    ('00000000-0000-0000-0000-000000000002', 'M', 'M', 3),
    ('00000000-0000-0000-0000-000000000002', 'L', 'L', 4),
    ('00000000-0000-0000-0000-000000000002', 'XL', 'XL', 5),
    ('00000000-0000-0000-0000-000000000002', 'XXL', 'XXL', 6),
    ('00000000-0000-0000-0000-000000000002', 'XXXL', 'XXXL', 7)
ON CONFLICT (attribute_id, value) DO NOTHING;

-- Insert default values for Material
INSERT INTO attribute_values (attribute_id, value, code, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000003', 'Cotton', 'CT', 1),
    ('00000000-0000-0000-0000-000000000003', 'Polyester', 'PL', 2),
    ('00000000-0000-0000-0000-000000000003', 'Silk', 'SK', 3),
    ('00000000-0000-0000-0000-000000000003', 'Wool', 'WL', 4),
    ('00000000-0000-0000-0000-000000000003', 'Linen', 'LN', 5),
    ('00000000-0000-0000-0000-000000000003', 'Denim', 'DN', 6),
    ('00000000-0000-0000-0000-000000000003', 'Leather', 'LT', 7),
    ('00000000-0000-0000-0000-000000000003', 'Nylon', 'NL', 8)
ON CONFLICT (attribute_id, value) DO NOTHING;

-- Insert default values for Pattern
INSERT INTO attribute_values (attribute_id, value, code, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000004', 'Solid', 'SO', 1),
    ('00000000-0000-0000-0000-000000000004', 'Striped', 'ST', 2),
    ('00000000-0000-0000-0000-000000000004', 'Checkered', 'CK', 3),
    ('00000000-0000-0000-0000-000000000004', 'Polka Dot', 'PD', 4),
    ('00000000-0000-0000-0000-000000000004', 'Floral', 'FL', 5),
    ('00000000-0000-0000-0000-000000000004', 'Graphic', 'GR', 6)
ON CONFLICT (attribute_id, value) DO NOTHING;

-- Insert default values for Fit
INSERT INTO attribute_values (attribute_id, value, code, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000005', 'Regular', 'RG', 1),
    ('00000000-0000-0000-0000-000000000005', 'Slim', 'SL', 2),
    ('00000000-0000-0000-0000-000000000005', 'Loose', 'LS', 3),
    ('00000000-0000-0000-0000-000000000005', 'Athletic', 'AT', 4),
    ('00000000-0000-0000-0000-000000000005', 'Petite', 'PT', 5),
    ('00000000-0000-0000-0000-000000000005', 'Tall', 'TL', 6)
ON CONFLICT (attribute_id, value) DO NOTHING;

-- Insert default SKU suffix rules
INSERT INTO sku_suffix_rules (name, code, is_active) VALUES
    ('Spring/Summer', 'SS24', true),
    ('Fall/Winter', 'FW24', true),
    ('Holiday', 'HL24', true),
    ('Basic', 'BAS', true)
ON CONFLICT (code) DO NOTHING;

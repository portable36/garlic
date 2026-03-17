-- Admin Database Schema
-- Database: admin_db

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Roles table (synced from auth_db)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Role permissions (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- User roles (user-role assignments)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES auth_db.users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES auth_db.users(id),
    PRIMARY KEY (user_id, role_id)
);

-- User ban tracking
CREATE TABLE IF NOT EXISTS user_bans (
    user_id UUID PRIMARY KEY REFERENCES auth_db.users(id) ON DELETE CASCADE,
    banned_at TIMESTAMP DEFAULT NOW(),
    banned_by UUID REFERENCES auth_db.users(id),
    reason TEXT
);

-- Settings table (dynamic key-value)
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string',
    setting_group VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_db.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth_db.users(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(512),
    status VARCHAR(20) DEFAULT 'pending',
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES auth_db.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES product_db.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth_db.users(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Shipping zones
CREATE TABLE IF NOT EXISTS shipping_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    regions TEXT[],
    rate DECIMAL(10,2) DEFAULT 0,
    free_threshold DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payment configurations
CREATE TABLE IF NOT EXISTS payment_configs (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    config JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics cache
CREATE TABLE IF NOT EXISTS analytics_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(100) UNIQUE NOT NULL,
    cache_value JSONB,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Default permissions
INSERT INTO permissions (name, description) VALUES
    ('manage_users', 'Create, edit, delete users'),
    ('manage_products', 'Create, edit, delete products'),
    ('manage_orders', 'View and manage orders'),
    ('manage_inventory', 'Manage stock levels'),
    ('manage_vendors', 'Approve and manage vendors'),
    ('manage_payments', 'View and process payments'),
    ('manage_shipping', 'Configure shipping settings'),
    ('manage_reviews', 'Moderate product reviews'),
    ('manage_settings', 'Modify system settings'),
    ('view_analytics', 'View dashboard analytics'),
    ('manage_roles', 'Create and assign roles')
ON CONFLICT (name) DO NOTHING;

-- Default roles
INSERT INTO roles (name, description) VALUES
    ('super_admin', 'Full system access'),
    ('admin', 'Administrative access'),
    ('vendor', 'Vendor/seller access'),
    ('support', 'Customer support access')
ON CONFLICT (name) DO NOTHING;

-- Grant all permissions to super_admin (role_id = 1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
ON CONFLICT DO NOTHING;

-- Admin role permissions (role_id = 2)
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (2, 2), (2, 3), (2, 4), (2, 7), (2, 8), (2, 9), (2, 10), (2, 11)
ON CONFLICT DO NOTHING;

-- Vendor role permissions (role_id = 3)
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (3, 2), (3, 3), (3, 4), (3, 8)
ON CONFLICT DO NOTHING;

-- Support role permissions (role_id = 4)
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (4, 3), (4, 8)
ON CONFLICT DO NOTHING;

-- Default settings
INSERT INTO settings (setting_key, setting_value, setting_type, setting_group) VALUES
    ('site_name', 'Garlic eCommerce', 'string', 'general'),
    ('site_description', 'Your one-stop shop for quality products', 'string', 'general'),
    ('site_logo', '', 'string', 'general'),
    ('currency', 'USD', 'string', 'general'),
    ('currency_symbol', '$', 'string', 'general'),
    ('timezone', 'UTC', 'string', 'general'),
    ('maintenance_mode', 'false', 'boolean', 'general'),
    
    ('tax_rate', '0', 'number', 'tax'),
    ('tax_enabled', 'false', 'boolean', 'tax'),
    ('tax_included', 'false', 'boolean', 'tax'),
    
    ('shipping_free_threshold', '100', 'number', 'shipping'),
    ('shipping_default_rate', '10', 'number', 'shipping'),
    ('shipping_enabled', 'true', 'boolean', 'shipping'),
    
    ('payment_stripe_enabled', 'false', 'boolean', 'payment'),
    ('payment_stripe_test_mode', 'true', 'boolean', 'payment'),
    ('payment_paypal_enabled', 'false', 'boolean', 'payment'),
    ('payment_paypal_test_mode', 'true', 'boolean', 'payment'),
    ('payment_cod_enabled', 'true', 'boolean', 'payment'),
    
    ('email_from', 'noreply@garlic.com', 'string', 'email'),
    ('email_smtp_host', '', 'string', 'email'),
    ('email_smtp_port', '587', 'number', 'email'),
    ('email_smtp_user', '', 'string', 'email'),
    ('email_smtp_password', '', 'string', 'email'),
    ('email_smtp_tls', 'true', 'boolean', 'email')
ON CONFLICT (setting_key) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_settings_group ON settings(setting_group);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

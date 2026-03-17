package models

import (
	"time"

	"github.com/google/uuid"
)

type Permission struct {
	ID          int       `db:"id" json:"id"`
	Name        string    `db:"name" json:"name"`
	Description string    `db:"description" json:"description"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

type Role struct {
	ID          int          `db:"id" json:"id"`
	Name        string       `db:"name" json:"name"`
	Description string       `db:"description" json:"description"`
	Permissions []Permission `json:"permissions,omitempty"`
	CreatedAt   time.Time    `db:"created_at" json:"created_at"`
}

type User struct {
	ID        uuid.UUID `db:"id" json:"id"`
	Email     string    `db:"email" json:"email"`
	RoleID    int       `db:"role_id" json:"role_id"`
	IsBanned  bool      `db:"is_banned" json:"is_banned"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

type UserRole struct {
	UserID     uuid.UUID `db:"user_id" json:"user_id"`
	RoleID     int       `db:"role_id" json:"role_id"`
	AssignedAt time.Time `db:"assigned_at" json:"assigned_at"`
	AssignedBy *uuid.UUID `db:"assigned_by" json:"assigned_by,omitempty"`
}

type UserBan struct {
	UserID   uuid.UUID  `db:"user_id" json:"user_id"`
	BannedAt time.Time  `db:"banned_at" json:"banned_at"`
	BannedBy *uuid.UUID `db:"banned_by" json:"banned_by,omitempty"`
	Reason   string     `db:"reason" json:"reason"`
}

type Setting struct {
	ID           int       `db:"id" json:"id"`
	SettingKey   string    `db:"setting_key" json:"setting_key"`
	SettingValue string    `db:"setting_value" json:"setting_value"`
	SettingType  string    `db:"setting_type" json:"setting_type"`
	SettingGroup string    `db:"setting_group" json:"setting_group"`
	IsPublic     bool      `db:"is_public" json:"is_public"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time `db:"updated_at" json:"updated_at"`
}

type AuditLog struct {
	ID          int          `db:"id" json:"id"`
	UserID      *uuid.UUID   `db:"user_id" json:"user_id,omitempty"`
	Action      string       `db:"action" json:"action"`
	EntityType  string       `db:"entity_type" json:"entity_type"`
	EntityID    string       `db:"entity_id" json:"entity_id"`
	Details     string       `db:"details" json:"details"`
	IPAddress   string       `db:"ip_address" json:"ip_address"`
	UserAgent   string       `db:"user_agent" json:"user_agent"`
	CreatedAt   time.Time    `db:"created_at" json:"created_at"`
}

type Vendor struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	UserID      uuid.UUID  `db:"user_id" json:"user_id"`
	StoreName   string     `db:"store_name" json:"store_name"`
	Description string     `db:"description" json:"description"`
	LogoURL     string     `db:"logo_url" json:"logo_url"`
	Status      string     `db:"status" json:"status"`
	ApprovedAt  *time.Time `db:"approved_at" json:"approved_at,omitempty"`
	ApprovedBy  *uuid.UUID `db:"approved_by" json:"approved_by,omitempty"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
}

type Review struct {
	ID        uuid.UUID `db:"id" json:"id"`
	ProductID uuid.UUID `db:"product_id" json:"product_id"`
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	Rating    int       `db:"rating" json:"rating"`
	Comment   string    `db:"comment" json:"comment"`
	Status    string    `db:"status" json:"status"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// Request/Response types
type UserWithRole struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	RoleID       int       `json:"role_id"`
	RoleName     string    `json:"role_name"`
	IsBanned     bool      `json:"is_banned"`
	BanReason    string    `json:"ban_reason,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type Analytics struct {
	TotalUsers       int64   `json:"total_users"`
	TotalOrders      int64   `json:"total_orders"`
	TotalRevenue     float64 `json:"total_revenue"`
	TotalProducts    int64   `json:"total_products"`
	PendingOrders    int64   `json:"pending_orders"`
	CompletedOrders  int64   `json:"completed_orders"`
	RecentOrders     []OrderSummary `json:"recent_orders"`
	SalesByDay       []DailySales   `json:"sales_by_day"`
}

type OrderSummary struct {
	ID            uuid.UUID `json:"id"`
	UserEmail     string    `json:"user_email"`
	TotalAmount   float64   `json:"total_amount"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

type DailySales struct {
	Date   string  `json:"date"`
	Amount float64 `json:"amount"`
}

type RoleWithPermissions struct {
	ID          int          `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Permissions []Permission `json:"permissions"`
}

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	Email  string    `json:"email"`
	RoleID int       `json:"role_id"`
	jwt.RegisteredClaims
}

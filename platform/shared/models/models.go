package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	RoleID       int       `json:"role_id" db:"role_id"`
	Role         *Role     `json:"role,omitempty"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type Role struct {
	ID        int       `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type Category struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	ParentID    *uuid.UUID `json:"parent_id" db:"parent_id"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type Product struct {
	ID          uuid.UUID     `json:"id" db:"id"`
	Name        string        `json:"name" db:"name"`
	Description string        `json:"description" db:"description"`
	Price       float64       `json:"price" db:"price"`
	CategoryID  *uuid.UUID    `json:"category_id" db:"category_id"`
	Category    *Category     `json:"category,omitempty"`
	Stock       int           `json:"stock" db:"stock"`
	IsActive    bool          `json:"is_active" db:"is_active"`
	Images      []ProductImage `json:"images,omitempty"`
	CreatedAt   time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at" db:"updated_at"`
}

type ProductImage struct {
	ID        uuid.UUID `json:"id" db:"id"`
	ProductID uuid.UUID `json:"product_id" db:"product_id"`
	ImageURL  string    `json:"image_url" db:"image_url"`
	IsPrimary bool      `json:"is_primary" db:"is_primary"`
	SortOrder int       `json:"sort_order" db:"sort_order"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type CartItem struct {
	ProductID uuid.UUID `json:"product_id"`
	Name      string    `json:"name"`
	Price     float64   `json:"price"`
	Quantity  int       `json:"quantity"`
	ImageURL  string    `json:"image_url,omitempty"`
}

type Cart struct {
	UserID uuid.UUID   `json:"user_id"`
	Items  []CartItem  `json:"items"`
	Total  float64     `json:"total"`
}

type Order struct {
	ID              uuid.UUID     `json:"id" db:"id"`
	UserID          uuid.UUID     `json:"user_id" db:"user_id"`
	TotalAmount     float64       `json:"total_amount" db:"total_amount"`
	Status          string        `json:"status" db:"status"`
	ShippingAddress string        `json:"shipping_address" db:"shipping_address"`
	PaymentMethod   string        `json:"payment_method" db:"payment_method"`
	PaymentStatus   string        `json:"payment_status" db:"payment_status"`
	Notes           string        `json:"notes" db:"notes"`
	Items           []OrderItem   `json:"items,omitempty"`
	CreatedAt       time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at" db:"updated_at"`
}

type OrderItem struct {
	ID           uuid.UUID `json:"id" db:"id"`
	OrderID      uuid.UUID `json:"order_id" db:"order_id"`
	ProductID    uuid.UUID `json:"product_id" db:"product_id"`
	ProductName  string    `json:"product_name" db:"product_name"`
	ProductPrice float64   `json:"product_price" db:"product_price"`
	Quantity     int       `json:"quantity" db:"quantity"`
	Subtotal     float64   `json:"subtotal" db:"subtotal"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

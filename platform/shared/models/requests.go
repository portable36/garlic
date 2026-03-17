package models

// Auth Requests/Responses
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	User         *User  `json:"user"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type UserResponse struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	RoleID    int       `json:"role_id"`
	RoleName  string    `json:"role_name,omitempty"`
	CreatedAt string    `json:"created_at"`
}

// Product Requests/Responses
type CreateProductRequest struct {
	Name        string     `json:"name" binding:"required"`
	Description string     `json:"description"`
	Price       float64    `json:"price" binding:"required,gt=0"`
	CategoryID  *uuid.UUID `json:"category_id"`
	Stock       int        `json:"stock" binding:"gte=0"`
	IsActive    bool       `json:"is_active"`
}

type UpdateProductRequest struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Price       float64    `json:"price"`
	CategoryID  *uuid.UUID `json:"category_id"`
	Stock       int        `json:"stock"`
	IsActive    bool       `json:"is_active"`
}

type ProductListResponse struct {
	Products   []Product `json:"products"`
	TotalCount int64     `json:"total_count"`
	Page       int       `json:"page"`
	PageSize   int       `json:"page_size"`
}

type ProductResponse struct {
	Product *Product `json:"product"`
}

// Cart Requests/Responses
type AddToCartRequest struct {
	ProductID uuid.UUID `json:"product_id" binding:"required"`
	Quantity  int       `json:"quantity" binding:"required,gt=0"`
}

type UpdateCartRequest struct {
	ProductID uuid.UUID `json:"product_id" binding:"required"`
	Quantity  int       `json:"quantity" binding:"gte=0"`
}

type CartResponse struct {
	Cart  *Cart  `json:"cart"`
	Error string `json:"error,omitempty"`
}

// Order Requests/Responses
type CreateOrderRequest struct {
	ShippingAddress string `json:"shipping_address" binding:"required"`
	PaymentMethod   string `json:"payment_method" binding:"required"`
}

type OrderListResponse struct {
	Orders []Order `json:"orders"`
	Total  int64   `json:"total"`
}

type OrderResponse struct {
	Order *Order `json:"order"`
}

// Category Requests/Responses
type CreateCategoryRequest struct {
	Name        string     `json:"name" binding:"required"`
	Description string     `json:"description"`
	ParentID    *uuid.UUID `json:"parent_id"`
}

type CategoryResponse struct {
	Category *Category `json:"category"`
}

type CategoryListResponse struct {
	Categories []Category `json:"categories"`
}

// Generic Responses
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

type SuccessResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type PaginatedRequest struct {
	Page     int `form:"page,default=1"`
	PageSize int `form:"page_size,default=20"`
}

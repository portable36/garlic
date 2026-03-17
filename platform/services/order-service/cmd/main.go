package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

type Config struct {
	Server            ServerConfig
	Database          DatabaseConfig
	CartServiceURL    string
	ProductServiceURL string
}

type ServerConfig struct {
	Port string
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{Port: getEnv("PORT", "8084")},
		Database: DatabaseConfig{
			Host: getEnv("DB_HOST", "postgres"), Port: 5432,
			User: getEnv("DB_USER", "postgres"), Password: getEnv("DB_PASSWORD", "postgres"),
			DBName: getEnv("DB_NAME", "order_db"), SSLMode: "disable",
		},
		CartServiceURL:    getEnv("CART_SERVICE_URL", "http://cart-service:8083"),
		ProductServiceURL: getEnv("PRODUCT_SERVICE_URL", "http://product-service:8082"),
	}
}

func getEnv(key, defaultValue string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return defaultValue
}

func main() {
	cfg := Load()

	db, err := sqlx.Connect("postgres", fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host, cfg.Database.Port, cfg.Database.User, cfg.Database.Password, cfg.Database.DBName, cfg.Database.SSLMode,
	))
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	r := gin.Default()
	r.Use(corsMiddleware())

	r.POST("/orders", authMiddleware(cfg.CartServiceURL), createOrderHandler(db, cfg.CartServiceURL))
	r.GET("/orders", authMiddleware(cfg.CartServiceURL), listOrdersHandler(db))
	r.GET("/orders/:id", authMiddleware(cfg.CartServiceURL), getOrderHandler(db))

	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("Order service starting on %s", addr)
	r.Run(addr)
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

func authMiddleware(cartServiceURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetHeader("X-User-ID")
		if userID == "" {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}
		c.Set("user_id", userID)
		c.Next()
	}
}

type Order struct {
	ID              uuid.UUID `db:"id"`
	UserID          uuid.UUID `db:"user_id"`
	TotalAmount     float64   `db:"total_amount"`
	Status          string    `db:"status"`
	ShippingAddress string    `db:"shipping_address"`
	PaymentMethod   string    `db:"payment_method"`
	PaymentStatus   string    `db:"payment_status"`
	Notes           string    `db:"notes"`
	CreatedAt       time.Time `db:"created_at"`
	UpdatedAt       time.Time `db:"updated_at"`
}

type OrderItem struct {
	ID           uuid.UUID `db:"id"`
	OrderID      uuid.UUID `db:"order_id"`
	ProductID    uuid.UUID `db:"product_id"`
	ProductName  string    `db:"product_name"`
	ProductPrice float64   `db:"product_price"`
	Quantity     int       `db:"quantity"`
	Subtotal     float64   `db:"subtotal"`
	CreatedAt    time.Time `db:"created_at"`
}

type CartItem struct {
	ProductID uuid.UUID `json:"product_id"`
	Name      string    `json:"name"`
	Price     float64   `json:"price"`
	Quantity  int       `json:"quantity"`
}

type Cart struct {
	UserID uuid.UUID  `json:"user_id"`
	Items  []CartItem `json:"items"`
	Total  float64    `json:"total"`
}

func createOrderHandler(db *sqlx.DB, cartServiceURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := uuid.Parse(c.GetString("user_id"))

		var req struct {
			ShippingAddress string `json:"shipping_address" binding:"required"`
			PaymentMethod   string `json:"payment_method" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// Get cart from cart service
		cartReq, _ := http.NewRequest("GET", cartServiceURL+"/cart", nil)
		cartReq.Header.Set("X-User-ID", c.GetString("user_id"))
		cartResp, err := http.DefaultClient.Do(cartReq)
		if err != nil || cartResp.StatusCode != 200 {
			c.JSON(400, gin.H{"error": "Failed to get cart"})
			return
		}
		defer cartResp.Body.Close()

		var cartRespBody struct {
			Cart Cart `json:"cart"`
		}
		json.NewDecoder(cartResp.Body).Decode(&cartRespBody)
		cart := cartRespBody.Cart

		if len(cart.Items) == 0 {
			c.JSON(400, gin.H{"error": "Cart is empty"})
			return
		}

		order := Order{
			ID:              uuid.New(),
			UserID:          userID,
			TotalAmount:     cart.Total,
			Status:          "pending",
			ShippingAddress: req.ShippingAddress,
			PaymentMethod:   req.PaymentMethod,
			PaymentStatus:   "pending",
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}

		_, err = db.Exec("INSERT INTO orders (id, user_id, total_amount, status, shipping_address, payment_method, payment_status, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
			order.ID, order.UserID, order.TotalAmount, order.Status, order.ShippingAddress, order.PaymentMethod, order.PaymentStatus, order.Notes, order.CreatedAt, order.UpdatedAt)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to create order"})
			return
		}

		for _, item := range cart.Items {
			subtotal := item.Price * float64(item.Quantity)
			_, err = db.Exec("INSERT INTO order_items (id, order_id, product_id, product_name, product_price, quantity, subtotal, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
				uuid.New(), order.ID, item.ProductID, item.Name, item.Price, item.Quantity, subtotal, time.Now())
		}

		// Clear cart
		http.NewRequest("DELETE", cartServiceURL+"/cart/clear", nil)

		c.JSON(201, gin.H{"order": order})
	}
}

func listOrdersHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := uuid.Parse(c.GetString("user_id"))

		var orders []Order
		err := db.Select(&orders, "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC", userID)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch orders"})
			return
		}

		c.JSON(200, gin.H{"orders": orders, "total": len(orders)})
	}
}

func getOrderHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := uuid.Parse(c.GetString("user_id"))
		orderID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid order ID"})
			return
		}

		var order Order
		err = db.Get(&order, "SELECT * FROM orders WHERE id = $1", orderID)
		if err != nil {
			c.JSON(404, gin.H{"error": "Order not found"})
			return
		}

		if order.UserID != userID {
			c.JSON(403, gin.H{"error": "Access denied"})
			return
		}

		var items []OrderItem
		db.Select(&items, "SELECT * FROM order_items WHERE order_id = $1", orderID)

		c.JSON(200, gin.H{"order": gin.H{
			"id":              order.ID,
			"user_id":         order.UserID,
			"total_amount":    order.TotalAmount,
			"status":           order.Status,
			"shipping_address": order.ShippingAddress,
			"payment_method":   order.PaymentMethod,
			"payment_status":  order.PaymentStatus,
			"created_at":      order.CreatedAt,
			"items":           items,
		}})
	}
}

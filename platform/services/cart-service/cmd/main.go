package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type Config struct {
	Server            ServerConfig
	Redis             RedisConfig
	ProductServiceURL string
}

type ServerConfig struct {
	Port string
}

type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

func (r *RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", r.Host, r.Port)
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{Port: getEnv("PORT", "8083")},
		Redis: RedisConfig{
			Host: getEnv("REDIS_HOST", "redis"), Port: 6379,
			Password: getEnv("REDIS_PASSWORD", ""), DB: 0,
		},
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

	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr(),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})

	ctx := context.Background()
	if _, err := rdb.Ping(ctx).Result(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	r := gin.Default()
	r.Use(corsMiddleware())

	r.GET("/cart", authMiddleware(cfg.Redis.Addr()), getCartHandler(rdb, cfg.ProductServiceURL))
	r.POST("/cart/add", authMiddleware(cfg.Redis.Addr()), addToCartHandler(rdb, cfg.ProductServiceURL))
	r.PUT("/cart/update", authMiddleware(cfg.Redis.Addr()), updateCartHandler(rdb))
	r.DELETE("/cart/remove/:productId", authMiddleware(cfg.Redis.Addr()), removeFromCartHandler(rdb))
	r.DELETE("/cart/clear", authMiddleware(cfg.Redis.Addr()), clearCartHandler(rdb))

	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("Cart service starting on %s", addr)
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

func authMiddleware(redisAddr string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Simplified - extract user from header (passed from gateway)
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

type CartItem struct {
	ProductID uuid.UUID `json:"product_id"`
	Name      string    `json:"name"`
	Price     float64   `json:"price"`
	Quantity  int       `json:"quantity"`
	ImageURL  string    `json:"image_url,omitempty"`
}

type Cart struct {
	UserID uuid.UUID  `json:"user_id"`
	Items  []CartItem `json:"items"`
	Total  float64    `json:"total"`
}

func cartKey(userID string) string {
	return fmt.Sprintf("cart:%s", userID)
}

func getCartHandler(rdb *redis.Client, productServiceURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		key := cartKey(userID)

		data, err := rdb.Get(c.Request.Context(), key).Bytes()
		if err == redis.Nil {
			c.JSON(200, gin.H{"cart": Cart{UserID: uuid.MustParse(userID), Items: []CartItem{}, Total: 0}})
			return
		}
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to get cart"})
			return
		}

		var cart Cart
		json.Unmarshal(data, &cart)

		c.JSON(200, gin.H{"cart": cart})
	}
}

func addToCartHandler(rdb *redis.Client, productServiceURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")

		var req struct {
			ProductID string `json:"product_id" binding:"required"`
			Quantity  int    `json:"quantity" binding:"required,gt=0"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		productID, _ := uuid.Parse(req.ProductID)

		// Get product from product service
		resp, err := http.Get(fmt.Sprintf("%s/products/%s", productServiceURL, req.ProductID))
		if err != nil || resp.StatusCode != 200 {
			c.JSON(400, gin.H{"error": "Product not found"})
			return
		}
		defer resp.Body.Close()

		var productResp struct {
			Product struct {
				ID    uuid.UUID `json:"id"`
				Name  string    `json:"name"`
				Price float64   `json:"price"`
				Images []struct {
					ImageURL string `json:"image_url"`
				} `json:"images"`
			} `json:"product"`
		}
		json.NewDecoder(resp.Body).Decode(&productResp)

		product := productResp.Product
		item := CartItem{
			ProductID: productID,
			Name:      product.Name,
			Price:     product.Price,
			Quantity:  req.Quantity,
		}
		if len(product.Images) > 0 {
			item.ImageURL = product.Images[0].ImageURL
		}

		key := cartKey(userID)
		var cart Cart
		data, _ := rdb.Get(c.Request.Context(), key).Bytes()
		if len(data) > 0 {
			json.Unmarshal(data, &cart)
		} else {
			cart = Cart{UserID: uuid.MustParse(userID), Items: []CartItem{}, Total: 0}
		}

		found := false
		for i, existing := range cart.Items {
			if existing.ProductID == productID {
				cart.Items[i].Quantity += req.Quantity
				found = true
				break
			}
		}
		if !found {
			cart.Items = append(cart.Items, item)
		}

		cart.Total = 0
		for _, item := range cart.Items {
			cart.Total += item.Price * float64(item.Quantity)
		}

		cartData, _ := json.Marshal(cart)
		rdb.Set(c.Request.Context(), key, cartData, 0)

		c.JSON(200, gin.H{"cart": cart})
	}
}

func updateCartHandler(rdb *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")

		var req struct {
			ProductID string `json:"product_id" binding:"required"`
			Quantity  int    `json:"quantity" binding:"gte=0"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		productID, _ := uuid.Parse(req.ProductID)
		key := cartKey(userID)

		var cart Cart
		data, _ := rdb.Get(c.Request.Context(), key).Bytes()
		json.Unmarshal(data, &cart)

		for i, item := range cart.Items {
			if item.ProductID == productID {
				if req.Quantity <= 0 {
					cart.Items = append(cart.Items[:i], cart.Items[i+1:]...)
				} else {
					diff := req.Quantity - item.Quantity
					cart.Items[i].Quantity = req.Quantity
					cart.Total += item.Price * float64(diff)
				}
				break
			}
		}

		cart.Total = 0
		for _, item := range cart.Items {
			cart.Total += item.Price * float64(item.Quantity)
		}

		cartData, _ := json.Marshal(cart)
		rdb.Set(c.Request.Context(), key, cartData, 0)

		c.JSON(200, gin.H{"cart": cart})
	}
}

func removeFromCartHandler(rdb *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		productID, _ := uuid.Parse(c.Param("productId"))
		key := cartKey(userID)

		var cart Cart
		data, _ := rdb.Get(c.Request.Context(), key).Bytes()
		json.Unmarshal(data, &cart)

		for i, item := range cart.Items {
			if item.ProductID == productID {
				cart.Total -= item.Price * float64(item.Quantity)
				cart.Items = append(cart.Items[:i], cart.Items[i+1:]...)
				break
			}
		}

		cartData, _ := json.Marshal(cart)
		rdb.Set(c.Request.Context(), key, cartData, 0)

		c.JSON(200, gin.H{"cart": cart})
	}
}

func clearCartHandler(rdb *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		key := cartKey(userID)
		rdb.Del(c.Request.Context(), key)
		c.JSON(200, gin.H{"message": "Cart cleared"})
	}
}

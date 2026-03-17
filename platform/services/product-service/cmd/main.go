package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	MinIO    MinIOConfig
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

type MinIOConfig struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{Port: getEnv("PORT", "8082")},
		Database: DatabaseConfig{
			Host: getEnv("DB_HOST", "postgres"), Port: 5432,
			User: getEnv("DB_USER", "postgres"), Password: getEnv("DB_PASSWORD", "postgres"),
			DBName: getEnv("DB_NAME", "product_db"), SSLMode: "disable",
		},
		MinIO: MinIOConfig{
			Endpoint: getEnv("MINIO_ENDPOINT", "minio:9000"),
			AccessKey: getEnv("MINIO_ACCESS_KEY", "minioadmin"),
			SecretKey: getEnv("MINIO_SECRET_KEY", "minioadmin"),
			Bucket: getEnv("MINIO_BUCKET", "products"),
			UseSSL: getEnv("MINIO_USE_SSL", "false") == "true",
		},
	}
}

func getEnv(key, defaultValue string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if v, ok := os.LookupEnv(key); ok {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
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

	minioClient, err := minio.New(cfg.MinIO.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIO.AccessKey, cfg.MinIO.SecretKey, ""),
		Secure: cfg.MinIO.UseSSL,
	})
	if err != nil {
		log.Fatalf("Failed to connect to MinIO: %v", err)
	}

	ctx := context.Background()
	bucketExists, _ := minioClient.BucketExists(ctx, cfg.MinIO.Bucket)
	if !bucketExists {
		minioClient.MakeBucket(ctx, cfg.MinIO.Bucket, minio.MakeBucketOptions{})
	}

	r := gin.Default()
	r.Use(corsMiddleware())

	r.GET("/products", listProductsHandler(db))
	r.GET("/products/:id", getProductHandler(db))
	r.GET("/products/categories", listCategoriesHandler(db))

	r.POST("/products", adminMiddleware(), createProductHandler(db))
	r.PUT("/products/:id", adminMiddleware(), updateProductHandler(db))
	r.DELETE("/products/:id", adminMiddleware(), deleteProductHandler(db))
	r.POST("/products/:id/upload-image", adminMiddleware(), uploadImageHandler(db, minioClient, cfg.MinIO.Bucket))

	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("Product service starting on %s", addr)
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

func adminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Simplified - in production, validate JWT and check role
		c.Next()
	}
}

type Product struct {
	ID          uuid.UUID  `db:"id"`
	Name        string     `db:"name"`
	Description string     `db:"description"`
	Price       float64    `db:"price"`
	CategoryID  *uuid.UUID `db:"category_id"`
	Stock       int        `db:"stock"`
	IsActive    bool       `db:"is_active"`
	CreatedAt   time.Time  `db:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at"`
}

type Category struct {
	ID          uuid.UUID `db:"id"`
	Name        string    `db:"name"`
	Description string    `db:"description"`
	ParentID    *uuid.UUID `db:"parent_id"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
}

func listProductsHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
		offset := (page - 1) * pageSize

		var products []Product
		err := db.Select(&products, "SELECT * FROM products WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2", pageSize, offset)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch products"})
			return
		}

		var count int64
		db.Get(&count, "SELECT COUNT(*) FROM products WHERE is_active = true")

		c.JSON(200, gin.H{
			"products":    products,
			"total_count": count,
			"page":        page,
			"page_size":   pageSize,
		})
	}
}

func getProductHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid product ID"})
			return
		}

		var product Product
		err = db.Get(&product, "SELECT * FROM products WHERE id = $1", id)
		if err != nil {
			c.JSON(404, gin.H{"error": "Product not found"})
			return
		}

		c.JSON(200, gin.H{"product": product})
	}
}

func listCategoriesHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var categories []Category
		err := db.Select(&categories, "SELECT * FROM categories ORDER BY name")
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch categories"})
			return
		}

		c.JSON(200, gin.H{"categories": categories})
	}
}

func createProductHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Name        string     `json:"name" binding:"required"`
			Description string     `json:"description"`
			Price       float64    `json:"price" binding:"required,gt=0"`
			CategoryID  *uuid.UUID `json:"category_id"`
			Stock       int        `json:"stock"`
			IsActive    bool       `json:"is_active"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		product := Product{
			ID: uuid.New(), Name: req.Name, Description: req.Description,
			Price: req.Price, CategoryID: req.CategoryID, Stock: req.Stock,
			IsActive: true, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		}

		_, err := db.Exec("INSERT INTO products (id, name, description, price, category_id, stock, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
			product.ID, product.Name, product.Description, product.Price, product.CategoryID, product.Stock, product.IsActive, product.CreatedAt, product.UpdatedAt)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to create product"})
			return
		}

		c.JSON(201, gin.H{"product": product})
	}
}

func updateProductHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid product ID"})
			return
		}

		var req struct {
			Name        string     `json:"name"`
			Description string     `json:"description"`
			Price       float64    `json:"price"`
			Stock       int        `json:"stock"`
			IsActive    bool       `json:"is_active"`
		}
		c.ShouldBindJSON(&req)

		_, err = db.Exec("UPDATE products SET name=$1, description=$2, price=$3, stock=$4, is_active=$5, updated_at=$6 WHERE id=$7",
			req.Name, req.Description, req.Price, req.Stock, req.IsActive, time.Now(), id)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to update product"})
			return
		}

		c.JSON(200, gin.H{"message": "Product updated"})
	}
}

func deleteProductHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid product ID"})
			return
		}

		_, err = db.Exec("DELETE FROM products WHERE id = $1", id)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to delete product"})
			return
		}

		c.JSON(200, gin.H{"message": "Product deleted"})
	}
}

func uploadImageHandler(db *sqlx.DB, minioClient *minio.Client, bucketName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		productID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid product ID"})
			return
		}

		file, header, err := c.Request.FormFile("image")
		if err != nil {
			c.JSON(400, gin.H{"error": "No file uploaded"})
			return
		}
		defer file.Close()

		objectName := fmt.Sprintf("%s/%s", productID.String(), header.Filename)
		_, err = minioClient.PutObject(context.Background(), bucketName, objectName, file, header.Size, minio.PutObjectOptions{
			ContentType: header.Header.Get("Content-Type"),
		})
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to upload image"})
			return
		}

		imageURL := fmt.Sprintf("http://%s/%s/%s", minioClient.EndpointURL().Host, bucketName, objectName)

		c.JSON(200, gin.H{"image_url": imageURL})
	}
}

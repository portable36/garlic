package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/boombuler/barcode/qr"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	AdminDB  DatabaseConfig
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

// Global product settings
var globalProductSettings ProductSettings

// SKU/Barcode generation handlers using global settings
func generateSKUHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req GenerateSKURequest
		c.ShouldBindJSON(&req)
		
		settings := globalProductSettings.SKUSettings
		
		// Override with request values if provided
		if req.Prefix != "" {
			settings.Prefix = req.Prefix
		}
		if req.Suffix != "" {
			settings.Suffix = req.Suffix
		}
		if req.Strategy != "" {
			settings.Strategy = req.Strategy
		}
		
		sku := GenerateSKU(settings, req.CategoryID)
		sku = EnsureUniqueSKU(db, sku)
		
		c.JSON(200, gin.H{"sku": sku})
	}
}

func generateBarcodeHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req GenerateBarcodeRequest
		c.ShouldBindJSON(&req)
		
		format := req.Format
		if format == "" {
			format = globalProductSettings.BarcodeFormat
		}
		
		prefix := req.Prefix
		if prefix == "" {
			prefix = globalProductSettings.BarcodePrefix
		}
		
		suffix := req.Suffix
		if suffix == "" {
			suffix = globalProductSettings.BarcodeSuffix
		}
		
		var barcodeValue string
		switch format {
		case "ean13":
			barcodeValue = GenerateEAN13(prefix)
		case "code128":
			barcodeValue = GenerateCode128(prefix + suffix)
		default:
			barcodeValue = GenerateEAN13(prefix)
		}
		
		// Generate image
		imgBase64, err := GenerateBarcodeImage(barcodeValue, format)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to generate barcode image"})
			return
		}
		
		c.JSON(200, gin.H{
			"barcode": barcodeValue,
			"format":  format,
			"image":   imgBase64,
		})
	}
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{Port: getEnv("PORT", "8082")},
		Database: DatabaseConfig{
			Host: getEnv("DB_HOST", "postgres"), Port: 5432,
			User: getEnv("DB_USER", "postgres"), Password: getEnv("DB_PASSWORD", "postgres"),
			DBName: getEnv("DB_NAME", "product_db"), SSLMode: "disable",
		},
		AdminDB: DatabaseConfig{
			Host: getEnv("DB_HOST", "postgres"), Port: 5432,
			User: getEnv("DB_USER", "postgres"), Password: getEnv("DB_PASSWORD", "postgres"),
			DBName: "admin_db", SSLMode: "disable",
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

// ============== MODELS ==============

type Product struct {
	ID          uuid.UUID       `db:"id" json:"id"`
	Name        string          `db:"name" json:"name"`
	Description string          `db:"description" json:"description"`
	Price       float64         `db:"price" json:"price"`
	CategoryID  *uuid.UUID      `db:"category_id" json:"category_id,omitempty"`
	VendorID    *uuid.UUID      `db:"vendor_id" json:"vendor_id,omitempty"`
	Stock       int             `db:"stock" json:"stock"`
	Discount    float64         `db:"discount" json:"discount"`
	Status      string          `db:"status" json:"status"`
	IsActive    bool            `db:"is_active" json:"is_active"`
	Variations  []ProductVariation `json:"variations,omitempty"`
	Images      []ProductImage   `json:"images,omitempty"`
	CreatedAt   time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time       `db:"updated_at" json:"updated_at"`
}

type ProductVariation struct {
	ID          uuid.UUID              `db:"id" json:"id"`
	ProductID   uuid.UUID              `db:"product_id" json:"product_id"`
	SKU         string                 `db:"sku" json:"sku"`
	Barcode     string                 `db:"barcode" json:"barcode,omitempty"`
	Attributes  map[string]string      `db:"attributes" json:"attributes"`
	Price       float64               `db:"price" json:"price"`
	Stock       int                   `db:"stock" json:"stock"`
	IsActive    bool                  `db:"is_active" json:"is_active"`
	CreatedAt   time.Time             `db:"created_at" json:"created_at"`
}

type ProductImage struct {
	ID         uuid.UUID `db:"id" json:"id"`
	ProductID  uuid.UUID `db:"product_id" json:"product_id"`
	ImageURL   string    `db:"image_url" json:"image_url"`
	IsPrimary  bool      `db:"is_primary" json:"is_primary"`
	SortOrder  int       `db:"sort_order" json:"sort_order"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
}

type Category struct {
	ID          uuid.UUID `db:"id" json:"id"`
	Name        string    `db:"name" json:"name"`
	Description string    `db:"description" json:"description,omitempty"`
	ParentID    *uuid.UUID `db:"parent_id" json:"parent_id,omitempty"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

// ============== REQUEST MODELS ==============

type CreateProductRequest struct {
	Name        string                     `json:"name" binding:"required"`
	Description string                     `json:"description"`
	Price       float64                    `json:"price" binding:"required,gt=0"`
	CategoryID  *uuid.UUID                 `json:"category_id"`
	VendorID    *uuid.UUID                 `json:"vendor_id"`
	Stock       int                        `json:"stock"`
	Discount    float64                    `json:"discount"`
	Status      string                     `json:"status"`
	Variations  []CreateVariationRequest   `json:"variations"`
}

type CreateVariationRequest struct {
	SKU        string                 `json:"sku"`
	Barcode    string                 `json:"barcode"`
	Attributes map[string]string      `json:"attributes"`
	Price      float64                `json:"price"`
	Stock      int                    `json:"stock"`
}

type GenerateSKURequest struct {
	Prefix      string `json:"prefix"`
	Suffix      string `json:"suffix"`
	Strategy    string `json:"strategy"` // random, incremental, timestamp
	CategoryID  string `json:"category_id"`
}

type GenerateBarcodeRequest struct {
	Prefix  string `json:"prefix"`
	Suffix  string `json:"suffix"`
	Format  string `json:"format"` // ean13, code128
}

// ============== SKU GENERATOR ==============

type SKUSettings struct {
	Prefix        string
	Suffix        string
	Strategy      string
	CategoryCode  bool
}

type ProductSettings struct {
	SKUSettings
	BarcodePrefix  string
	BarcodeSuffix  string
	BarcodeFormat  string
}

func LoadProductSettings(adminDB *sqlx.DB) ProductSettings {
	settings := ProductSettings{
		SKUSettings: SKUSettings{
			Prefix:       "PRD",
			Suffix:       "",
			Strategy:     "incremental",
			CategoryCode: true,
		},
		BarcodePrefix: "200",
		BarcodeSuffix: "",
		BarcodeFormat: "ean13",
	}
	
	if adminDB == nil {
		return settings
	}
	
	rows, err := adminDB.Queryx("SELECT setting_key, setting_value FROM settings WHERE setting_group = 'product'")
	if err != nil {
		log.Printf("Failed to load product settings: %v", err)
		return settings
	}
	defer rows.Close()
	
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		switch key {
		case "sku_prefix":
			settings.Prefix = value
		case "sku_suffix":
			settings.Suffix = value
		case "sku_strategy":
			settings.Strategy = value
		case "sku_category_code":
			settings.CategoryCode = value == "true"
		case "barcode_prefix":
			settings.BarcodePrefix = value
		case "barcode_suffix":
			settings.BarcodeSuffix = value
		case "barcode_format":
			settings.BarcodeFormat = value
		}
	}
	
	log.Printf("Loaded product settings: SKU prefix=%s, strategy=%s, barcode=%s", 
		settings.Prefix, settings.Strategy, settings.BarcodeFormat)
	
	return settings
}

func GenerateSKU(settings SKUSettings, categoryCode string) string {
	var unique string
	
	switch settings.Strategy {
	case "random":
		unique = fmt.Sprintf("%06d", rand.Intn(999999))
	case "incremental":
		// Get next incremental number from DB
		unique = fmt.Sprintf("%06d", time.Now().UnixNano()%1000000)
	case "timestamp":
		unique = fmt.Sprintf("%d", time.Now().Unix())
	default:
		unique = fmt.Sprintf("%06d", rand.Intn(999999))
	}
	
	catCode := ""
	if settings.CategoryCode && categoryCode != "" {
		catCode = "-" + strings.ToUpper(categoryCode)
	}
	
	return settings.Prefix + catCode + unique + settings.Suffix
}

func EnsureUniqueSKU(db *sqlx.DB, sku string) string {
	var count int
	for {
		err := db.Get(&count, "SELECT COUNT(*) FROM product_variations WHERE sku = $1", sku)
		if err != nil || count == 0 {
			return sku
		}
		// Append random suffix to make unique
		sku = sku + fmt.Sprintf("-%d", rand.Intn(100))
	}
}

// ============== BARCODE GENERATOR ==============

func GenerateEAN13(prefix string) string {
	// Generate 12 digit number with prefix
	prefix = strings.ReplaceAll(prefix, "0", "")
	if prefix == "" {
		prefix = "200"
	}
	
	// Take first 11 digits
	digits := prefix
	for len(digits) < 11 {
		digits += "0"
	}
	digits = digits[:11]
	
	// Calculate check digit
	sum := 0
	for i, d := range digits {
		digit := int(d - '0')
		if i%2 == 0 {
			sum += digit * 1
		} else {
			sum += digit * 3
		}
	}
	checkDigit := (10 - (sum % 10)) % 10
	
	return digits + strconv.Itoa(checkDigit)
}

func GenerateCode128(data string) string {
	return data
}

func GenerateQRCode(data string) (string, error) {
	qrCode, err := qr.Encode(data, qr.M, qr.Auto)
	if err != nil {
		return "", err
	}
	
	// Return barcode value for now (skip image generation to avoid dependency issues)
	return qrCode.Content(), nil
}

func GenerateBarcodeImage(barcodeValue, format string) (string, error) {
	// Return barcode value for now (skip image generation to avoid dependency issues)
	return barcodeValue, nil
}

// ============== HANDLERS ==============

func createProductHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreateProductRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		
		// Get category code for SKU
		categoryCode := ""
		if req.CategoryID != nil {
			var cat Category
			err := db.Get(&cat, "SELECT name FROM categories WHERE id = $1", req.CategoryID)
			if err == nil {
				words := strings.Fields(cat.Name)
				for _, w := range words {
					categoryCode += w[:min(3, len(w))]
				}
			}
		}
		
		// Default values
		status := req.Status
		if status == "" {
			status = "draft"
		}
		if req.Stock == 0 {
			req.Stock = 0
		}
		if req.Discount == 0 {
			req.Discount = 0
		}
		
		product := Product{
			ID:          uuid.New(),
			Name:        req.Name,
			Description: req.Description,
			Price:       req.Price,
			CategoryID:  req.CategoryID,
			VendorID:    req.VendorID,
			Stock:       req.Stock,
			Discount:    req.Discount,
			Status:      status,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		
		tx, err := db.Beginx()
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to start transaction"})
			return
		}
		defer tx.Rollback()
		
		// Insert product
		_, err = tx.Exec(`
			INSERT INTO products (id, name, description, price, category_id, vendor_id, stock, discount, status, is_active, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
			product.ID, product.Name, product.Description, product.Price, product.CategoryID,
			product.VendorID, product.Stock, product.Discount, product.Status, product.IsActive,
			product.CreatedAt, product.UpdatedAt)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to create product: " + err.Error()})
			return
		}
		
		// Insert variations if provided
		skuSettings := SKUSettings{
			Prefix:       "PRD",
			Suffix:       "",
			Strategy:     "incremental",
			CategoryCode: true,
		}
		
		for i, vReq := range req.Variations {
			sku := vReq.SKU
			if sku == "" {
				sku = GenerateSKU(skuSettings, categoryCode)
				sku = EnsureUniqueSKU(db, sku)
			}
			
			attrs, _ := json.Marshal(vReq.Attributes)
			
			price := vReq.Price
			if price == 0 {
				price = req.Price
			}
			
			stock := vReq.Stock
			if i == 0 && stock == 0 && req.Stock > 0 {
				stock = req.Stock
			}
			
			variation := ProductVariation{
				ID:         uuid.New(),
				ProductID:  product.ID,
				SKU:        sku,
				Barcode:    vReq.Barcode,
				Attributes: vReq.Attributes,
				Price:      price,
				Stock:      stock,
				IsActive:   true,
				CreatedAt:  time.Now(),
			}
			
			_, err = tx.Exec(`
				INSERT INTO product_variations (id, product_id, sku, barcode, attributes, price, stock, is_active, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
				variation.ID, variation.ProductID, variation.SKU, variation.Barcode, attrs,
				variation.Price, variation.Stock, variation.IsActive, variation.CreatedAt)
			if err != nil {
				c.JSON(500, gin.H{"error": "Failed to create variation: " + err.Error()})
				return
			}
		}
		
		if err := tx.Commit(); err != nil {
			c.JSON(500, gin.H{"error": "Failed to commit transaction"})
			return
		}
		
		// Fetch complete product with variations
		var result Product
		err = db.Get(&result, "SELECT * FROM products WHERE id = $1", product.ID)
		if err == nil {
			db.Select(&result.Variations, "SELECT * FROM product_variations WHERE product_id = $1", product.ID)
			db.Select(&result.Images, "SELECT * FROM product_images WHERE product_id = $1", product.ID)
		}
		
		c.JSON(201, gin.H{"product": result})
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
		
		db.Select(&product.Variations, "SELECT * FROM product_variations WHERE product_id = $1", id)
		db.Select(&product.Images, "SELECT * FROM product_images WHERE product_id = $1", id)
		
		// Parse attributes JSON
		for i := range product.Variations {
			if product.Variations[i].Attributes == nil {
				product.Variations[i].Attributes = make(map[string]string)
			}
		}
		
		c.JSON(200, gin.H{"product": product})
	}
}

func listProductsHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
		offset := (page - 1) * pageSize
		
		var products []Product
		err := db.Select(&products, "SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2", pageSize, offset)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch products"})
			return
		}
		
		// Get variations for each product
		for i := range products {
			db.Select(&products[i].Variations, "SELECT * FROM product_variations WHERE product_id = $1", products[i].ID)
			db.Select(&products[i].Images, "SELECT * FROM product_images WHERE product_id = $1", products[i].ID)
		}
		
		var count int64
		db.Get(&count, "SELECT COUNT(*) FROM products")
		
		c.JSON(200, gin.H{
			"products":     products,
			"total_count": count,
			"page":         page,
			"page_size":    pageSize,
		})
	}
}

func updateProductHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid product ID"})
			return
		}
		
		var req map[string]interface{}
		c.ShouldBindJSON(&req)
		
		// Build dynamic update query
		var sets []string
		var args []interface{}
		argNum := 1
		
		if name, ok := req["name"].(string); ok {
			sets = append(sets, fmt.Sprintf("name=$%d", argNum))
			args = append(args, name)
			argNum++
		}
		if desc, ok := req["description"].(string); ok {
			sets = append(sets, fmt.Sprintf("description=$%d", argNum))
			args = append(args, desc)
			argNum++
		}
		if price, ok := req["price"].(float64); ok {
			sets = append(sets, fmt.Sprintf("price=$%d", argNum))
			args = append(args, price)
			argNum++
		}
		if stock, ok := req["stock"].(float64); ok {
			sets = append(sets, fmt.Sprintf("stock=$%d", argNum))
			args = append(args, int(stock))
			argNum++
		}
		if status, ok := req["status"].(string); ok {
			sets = append(sets, fmt.Sprintf("status=$%d", argNum))
			args = append(args, status)
			argNum++
		}
		if discount, ok := req["discount"].(float64); ok {
			sets = append(sets, fmt.Sprintf("discount=$%d", argNum))
			args = append(args, discount)
			argNum++
		}
		
		sets = append(sets, fmt.Sprintf("updated_at=$%d", argNum))
		args = append(args, time.Now())
		argNum++
		
		args = append(args, id)
		
		query := fmt.Sprintf("UPDATE products SET %s WHERE id=$%d", strings.Join(sets, ", "), argNum)
		_, err = db.Exec(query, args...)
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

// Variation handlers
func addVariationHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		productID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid product ID"})
			return
		}
		
		var req CreateVariationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		
		sku := req.SKU
		if sku == "" {
			sku = GenerateSKU(SKUSettings{Prefix: "PRD", Strategy: "incremental"}, "")
			sku = EnsureUniqueSKU(db, sku)
		} else {
			// Check if manual SKU already exists
			var count int
			db.Get(&count, "SELECT COUNT(*) FROM product_variations WHERE sku = $1", sku)
			if count > 0 {
				c.JSON(400, gin.H{"error": "SKU already exists"})
				return
			}
		}
		
		attrs, _ := json.Marshal(req.Attributes)
		
		variation := ProductVariation{
			ID:         uuid.New(),
			ProductID:  productID,
			SKU:        sku,
			Barcode:    req.Barcode,
			Attributes: req.Attributes,
			Price:      req.Price,
			Stock:      req.Stock,
			IsActive:   true,
			CreatedAt:  time.Now(),
		}
		
		_, err = db.Exec(`
			INSERT INTO product_variations (id, product_id, sku, barcode, attributes, price, stock, is_active, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			variation.ID, variation.ProductID, variation.SKU, variation.Barcode, attrs,
			variation.Price, variation.Stock, variation.IsActive, variation.CreatedAt)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to create variation"})
			return
		}
		
		c.JSON(201, gin.H{"variation": variation})
	}
}

func updateVariationHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		vid, err := uuid.Parse(c.Param("varId"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid variation ID"})
			return
		}
		
		var req map[string]interface{}
		c.ShouldBindJSON(&req)
		
		var sets []string
		var args []interface{}
		argNum := 1
		
		if sku, ok := req["sku"].(string); ok {
			// Check uniqueness
			var count int
			db.Get(&count, "SELECT COUNT(*) FROM product_variations WHERE sku = $1 AND id != $2", sku, vid)
			if count > 0 {
				c.JSON(400, gin.H{"error": "SKU already exists"})
				return
			}
			sets = append(sets, fmt.Sprintf("sku=$%d", argNum))
			args = append(args, sku)
			argNum++
		}
		if barcode, ok := req["barcode"].(string); ok {
			sets = append(sets, fmt.Sprintf("barcode=$%d", argNum))
			args = append(args, barcode)
			argNum++
		}
		if price, ok := req["price"].(float64); ok {
			sets = append(sets, fmt.Sprintf("price=$%d", argNum))
			args = append(args, price)
			argNum++
		}
		if stock, ok := req["stock"].(float64); ok {
			sets = append(sets, fmt.Sprintf("stock=$%d", argNum))
			args = append(args, int(stock))
			argNum++
		}
		if attrs, ok := req["attributes"].(map[string]interface{}); ok {
			attrsJSON, _ := json.Marshal(attrs)
			sets = append(sets, fmt.Sprintf("attributes=$%d", argNum))
			args = append(args, string(attrsJSON))
			argNum++
		}
		
		if len(sets) == 0 {
			c.JSON(400, gin.H{"error": "No fields to update"})
			return
		}
		
		args = append(args, vid)
		query := fmt.Sprintf("UPDATE product_variations SET %s WHERE id=$%d", strings.Join(sets, ", "), argNum)
		
		_, err = db.Exec(query, args...)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to update variation"})
			return
		}
		
		c.JSON(200, gin.H{"message": "Variation updated"})
	}
}

func deleteVariationHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		vid, err := uuid.Parse(c.Param("varId"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid variation ID"})
			return
		}
		
		_, err = db.Exec("DELETE FROM product_variations WHERE id = $1", vid)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to delete variation"})
			return
		}
		
		c.JSON(200, gin.H{"message": "Variation deleted"})
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
			c.JSON(500, gin.H{"error": "Failed to upload image: " + err.Error()})
			return
		}
		
		imageURL := fmt.Sprintf("http://%s/%s/%s", minioClient.EndpointURL().Host, bucketName, objectName)
		
		// Save to database
		image := ProductImage{
			ID:        uuid.New(),
			ProductID: productID,
			ImageURL:  imageURL,
			IsPrimary: false,
			CreatedAt: time.Now(),
		}
		
		// Check if this is first image
		var count int
		db.Get(&count, "SELECT COUNT(*) FROM product_images WHERE product_id = $1", productID)
		if count == 0 {
			image.IsPrimary = true
		}
		db.Get(&count, "SELECT COUNT(*) FROM product_images WHERE product_id = $1", productID)
		image.SortOrder = count
		
		db.Exec(`
			INSERT INTO product_images (id, product_id, image_url, is_primary, sort_order, created_at)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			image.ID, image.ProductID, image.ImageURL, image.IsPrimary, image.SortOrder, image.CreatedAt)
		
		c.JSON(200, gin.H{"image": image})
	}
}

func adminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Simplified - in production, validate JWT and check role
		c.Next()
	}
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

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func main() {
	rand.Seed(time.Now().UnixNano())
	
	cfg := Load()
	
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host, cfg.Database.Port, cfg.Database.User, cfg.Database.Password, cfg.Database.DBName, cfg.Database.SSLMode)
	
	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	
	// Connect to admin_db for settings
	adminDsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.AdminDB.Host, cfg.AdminDB.Port, cfg.AdminDB.User, cfg.AdminDB.Password, cfg.AdminDB.DBName, cfg.AdminDB.SSLMode)
	
	adminDB, err := sqlx.Connect("postgres", adminDsn)
	if err != nil {
		log.Printf("Warning: Failed to connect to admin_db: %v. Using default settings.", err)
		adminDB = nil
	} else {
		defer adminDB.Close()
	}
	
	// Load product settings
	globalProductSettings = LoadProductSettings(adminDB)
	
	// Initialize MinIO client
	minioClient, err := minio.New(cfg.MinIO.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIO.AccessKey, cfg.MinIO.SecretKey, ""),
		Secure: cfg.MinIO.UseSSL,
	})
	if err != nil {
		log.Printf("Warning: Failed to connect to MinIO: %v", err)
		minioClient = nil
	} else {
		ctx := context.Background()
		bucketExists, _ := minioClient.BucketExists(ctx, cfg.MinIO.Bucket)
		if !bucketExists {
			minioClient.MakeBucket(ctx, cfg.MinIO.Bucket, minio.MakeBucketOptions{})
		}
	}
	
	r := gin.Default()
	r.RemoveExtraSlash = true
	r.Use(corsMiddleware())
	
	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	
	// Public endpoints
	r.GET("/products/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	r.GET("/products", listProductsHandler(db))
	r.GET("/products/:id", getProductHandler(db))
	r.GET("/products/categories", listCategoriesHandler(db))
	
	// Admin endpoints
	admin := r.Group("/products")
	admin.Use(adminMiddleware())
	{
		admin.POST("", createProductHandler(db))
		admin.PUT("/:id", updateProductHandler(db))
		admin.DELETE("/:id", deleteProductHandler(db))
		
		// Variations
		admin.POST("/:id/variations", addVariationHandler(db))
		admin.PUT("/:id/variations/:varId", updateVariationHandler(db))
		admin.DELETE("/:id/variations/:varId", deleteVariationHandler(db))
		
		// Images
		admin.POST("/:id/images", uploadImageHandler(db, minioClient, cfg.MinIO.Bucket))
		
		// SKU/Barcode generation
		admin.POST("/generate-sku", generateSKUHandler(db))
		admin.POST("/generate-barcode", generateBarcodeHandler(db))
	}
	
	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("Product service starting on %s", addr)
	r.Run(addr)
}

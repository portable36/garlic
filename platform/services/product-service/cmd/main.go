package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"sort"
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
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
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
	ID          uuid.UUID        `gorm:"type:uuid;primaryKey" db:"id" json:"id"`
	Name        string           `gorm:"type:varchar(255);not null" db:"name" json:"name"`
	Description string           `gorm:"type:text" db:"description" json:"description"`
	Price       float64          `gorm:"type:numeric(10,2);not null" db:"price" json:"price"`
	BrandID     *uuid.UUID       `gorm:"type:uuid" db:"brand_id" json:"brand_id,omitempty"`
	BrandCode   string           `gorm:"type:varchar(20)" db:"brand_code" json:"brand_code,omitempty"`
	CategoryID  *uuid.UUID       `gorm:"type:uuid" db:"category_id" json:"category_id,omitempty"`
	VendorID    *uuid.UUID       `gorm:"type:uuid" db:"vendor_id" json:"vendor_id,omitempty"`
	Stock       int              `gorm:"default:0" db:"stock" json:"stock"`
	Discount    float64          `gorm:"type:numeric(5,2);default:0" db:"discount" json:"discount"`
	Status      string           `gorm:"type:varchar(20);default:'draft'" db:"status" json:"status"`
	IsActive    bool             `gorm:"default:true" db:"is_active" json:"is_active"`
	Variations  []ProductVariation `gorm:"-" json:"variations,omitempty"`
	Images      []ProductImage   `gorm:"-" json:"images,omitempty"`
	CreatedAt   time.Time        `gorm:"autoCreateTime" db:"created_at" json:"created_at"`
	UpdatedAt   time.Time        `gorm:"autoUpdateTime" db:"updated_at" json:"updated_at"`
}

func (Product) TableName() string {
	return "products"
}

type ProductVariation struct {
	ID          uuid.UUID              `gorm:"type:uuid;primaryKey" db:"id" json:"id"`
	ProductID   uuid.UUID              `gorm:"type:uuid;not null;index" db:"product_id" json:"product_id"`
	SKU         string                 `gorm:"type:varchar(50)" db:"sku" json:"sku"`
	Barcode     string                 `gorm:"type:varchar(50)" db:"barcode" json:"barcode,omitempty"`
	Attributes  map[string]string      `gorm:"type:jsonb;default:'{}'" db:"attributes" json:"attributes"`
	Price       float64                `gorm:"type:numeric(10,2);not null" db:"price" json:"price"`
	Stock       int                    `gorm:"default:0" db:"stock" json:"stock"`
	IsActive    bool                   `gorm:"default:true" db:"is_active" json:"is_active"`
	CreatedAt   time.Time              `gorm:"autoCreateTime" db:"created_at" json:"created_at"`
}

func (ProductVariation) TableName() string {
	return "product_variations"
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

type GORMCategory struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string     `gorm:"type:varchar(255);not null" json:"name"`
	Description string     `gorm:"type:text" json:"description,omitempty"`
	ParentID    *uuid.UUID `gorm:"type:uuid" json:"parent_id,omitempty"`
	Parent      *GORMCategory `gorm:"foreignKey:ParentID" json:"-"`
	Children    []GORMCategory `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	SortOrder   int        `gorm:"default:0" json:"sort_order"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
}

func (GORMCategory) TableName() string {
	return "categories"
}

type CategoryTreeItem struct {
	ID          uuid.UUID        `json:"id"`
	Name        string           `json:"name"`
	Description string            `json:"description,omitempty"`
	ParentID    *uuid.UUID       `json:"parent_id,omitempty"`
	Children    []CategoryTreeItem `json:"children,omitempty"`
}

type GORMAttributeDefinition struct {
	ID          uuid.UUID           `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string              `gorm:"type:varchar(100);not null;uniqueIndex" json:"name"`
	Code        string              `gorm:"type:varchar(50);not null;uniqueIndex" json:"code"`
	Description string              `gorm:"type:text" json:"description,omitempty"`
	Type        string              `gorm:"type:varchar(20);default:'select'" json:"type"`
	IsRequired  bool                `gorm:"default:false" json:"is_required"`
	IsFilterable bool               `gorm:"default:false" json:"is_filterable"`
	IsSearchable bool               `gorm:"default:false" json:"is_searchable"`
	DisplayOrder int                `gorm:"default:0" json:"display_order"`
	IsActive    bool                `gorm:"default:true" json:"is_active"`
	Values      []GORMAttributeValue `gorm:"foreignKey:AttributeID" json:"values,omitempty"`
	CreatedAt   time.Time           `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time           `gorm:"autoUpdateTime" json:"updated_at"`
}

func (GORMAttributeDefinition) TableName() string {
	return "attribute_definitions"
}

type GORMAttributeValue struct {
	ID         uuid.UUID               `gorm:"type:uuid;primaryKey" json:"id"`
	AttributeID uuid.UUID              `gorm:"type:uuid;not null;index" json:"attribute_id"`
	Value      string                  `gorm:"type:varchar(255);not null" json:"value"`
	Code       string                  `gorm:"type:varchar(50);not null" json:"code"`
	SwatchColor string                 `gorm:"type:varchar(20)" json:"swatch_color,omitempty"`
	SwatchImage string                 `gorm:"type:varchar(500)" json:"swatch_image,omitempty"`
	DisplayOrder int                   `gorm:"default:0" json:"display_order"`
	IsActive   bool                    `gorm:"default:true" json:"is_active"`
	CreatedAt  time.Time               `gorm:"autoCreateTime" json:"created_at"`
}

func (GORMAttributeValue) TableName() string {
	return "attribute_values"
}

type GORMSKUSuffixRule struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Name         string    `gorm:"type:varchar(100);not null" json:"name"`
	Code         string    `gorm:"type:varchar(50);not null;uniqueIndex" json:"code"`
	Suffix       string    `gorm:"type:varchar(50);not null" json:"suffix"`
	Description  string    `gorm:"type:text" json:"description,omitempty"`
	ValidFrom    *time.Time `gorm:"type:timestamp" json:"valid_from,omitempty"`
	ValidTo      *time.Time `gorm:"type:timestamp" json:"valid_to,omitempty"`
	IsSystem     bool      `gorm:"default:false" json:"is_system"`
	IsActive     bool      `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (GORMSKUSuffixRule) TableName() string {
	return "sku_suffix_rules"
}

type GORMBrand struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string     `gorm:"type:varchar(255);not null" json:"name"`
	Slug        string     `gorm:"type:varchar(255);not null;uniqueIndex" json:"slug"`
	BrandCode   string     `gorm:"type:varchar(20)" json:"brand_code"`
	LogoURL     string     `gorm:"type:text" json:"logo_url,omitempty"`
	Description string     `gorm:"type:text" json:"description,omitempty"`
	Tier        string     `gorm:"type:varchar(20);default:'standard'" json:"tier"`
	Status      string     `gorm:"type:varchar(20);default:'active'" json:"status"`
	CreatedBy   *uuid.UUID `gorm:"type:uuid" json:"created_by,omitempty"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
}

func (GORMBrand) TableName() string {
	return "brands"
}

type GORMVariationAttributeValue struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	VariationID      uuid.UUID `gorm:"type:uuid;not null;index" json:"variation_id"`
	AttributeID      uuid.UUID `gorm:"type:uuid;not null" json:"attribute_id"`
	AttributeValueID uuid.UUID `gorm:"type:uuid;not null" json:"attribute_value_id"`
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (GORMVariationAttributeValue) TableName() string {
	return "product_variation_attribute_values"
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

type CreateBrandRequest struct {
	Name        string `json:"name" binding:"required"`
	LogoURL     string `json:"logo_url"`
	Description string `json:"description"`
	Tier        string `json:"tier"`
}

type CreateProductV2Request struct {
	Name        string                                  `json:"name" binding:"required"`
	Description string                                  `json:"description"`
	Price       float64                                 `json:"price" binding:"required,gt=0"`
	BrandID    *uuid.UUID                              `json:"brand_id"`
	BrandCode   string                                 `json:"brand_code"`
	CategoryID  *uuid.UUID                              `json:"category_id"`
	VendorID    *uuid.UUID                              `json:"vendor_id"`
	Stock       int                                     `json:"stock"`
	Discount    float64                                 `json:"discount"`
	Status      string                                  `json:"status"`
	Variations  []CreateVariationWithAttributesRequest  `json:"variations"`
}

type CreateVariationWithAttributesRequest struct {
	SKU               string            `json:"sku"`
	Barcode           string            `json:"barcode"`
	Attributes        map[string]string `json:"attributes"`
	AttributeValueIDs []uuid.UUID       `json:"attribute_value_ids"`
	Price             float64           `json:"price"`
	Stock             int               `json:"stock"`
}

type GenerateSKURequestV3 struct {
	BrandCode      string   `json:"brand_code"`
	ProductCode    string   `json:"product_code" binding:"required"`
	AttributeCodes []string `json:"attribute_codes"`
	Suffix         string   `json:"suffix"`
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

type CreateAttributeRequest struct {
	Name        string `json:"name" binding:"required"`
	Code        string `json:"code" binding:"required"`
	Description string `json:"description"`
	Type        string `json:"type"`
	IsRequired  bool   `json:"is_required"`
	IsFilterable bool  `json:"is_filterable"`
	IsSearchable bool  `json:"is_searchable"`
	DisplayOrder int   `json:"display_order"`
}

type CreateAttributeValueRequest struct {
	AttributeID uuid.UUID `json:"attribute_id" binding:"required"`
	Value       string    `json:"value" binding:"required"`
	Code        string    `json:"code" binding:"required"`
	SwatchColor string    `json:"swatch_color"`
	SwatchImage string    `json:"swatch_image"`
	DisplayOrder int      `json:"display_order"`
}

type GenerateMatrixRequest struct {
	ProductCode string                     `json:"product_code" binding:"required"`
	BrandCode   string                     `json:"brand_code"`
	Prefix      string                     `json:"prefix"`
	Suffix      string                     `json:"suffix"`
	CategoryID  *uuid.UUID                 `json:"category_id"`
	Selections  []AttributeSelectionRequest `json:"selections"`
}

type AttributeSelectionRequest struct {
	AttributeID uuid.UUID `json:"attribute_id" binding:"required"`
	ValueIDs    []uuid.UUID `json:"value_ids" binding:"required"`
}

type GenerateSKURequestV2 struct {
	ProductCode    string            `json:"product_code" binding:"required"`
	Prefix         string            `json:"prefix"`
	Suffix         string            `json:"suffix"`
	AttributeCodes []string          `json:"attribute_codes"`
	CategoryID    *uuid.UUID        `json:"category_id"`
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
		
		type ProductRow struct {
			ID          uuid.UUID  `db:"id"`
			Name        string     `db:"name"`
			Description *string    `db:"description"`
			Price       float64    `db:"price"`
			BrandID     *uuid.UUID `db:"brand_id"`
			BrandCode   *string    `db:"brand_code"`
			CategoryID  *uuid.UUID `db:"category_id"`
			VendorID    *uuid.UUID `db:"vendor_id"`
			Stock       int        `db:"stock"`
			Discount    float64    `db:"discount"`
			Status      *string    `db:"status"`
			IsActive    bool       `db:"is_active"`
			CreatedAt   time.Time  `db:"created_at"`
			UpdatedAt   time.Time  `db:"updated_at"`
		}
		
		var products []ProductRow
		err := db.Select(&products, "SELECT id, name, description, price, brand_id, brand_code, category_id, vendor_id, stock, discount, status, is_active, created_at, updated_at FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2", pageSize, offset)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch products: " + err.Error()})
			return
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

func listCategoriesTreeHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var categories []GORMCategory
		if err := db.Preload("Children").Where("parent_id IS NULL").Order("sort_order, name").Find(&categories).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch categories"})
			return
		}

		tree := buildCategoryTree(categories)
		c.JSON(200, gin.H{"categories": tree})
	}
}

func buildCategoryTree(categories []GORMCategory) []CategoryTreeItem {
	var result []CategoryTreeItem
	for _, cat := range categories {
		item := CategoryTreeItem{
			ID:          cat.ID,
			Name:        cat.Name,
			Description: cat.Description,
			ParentID:    cat.ParentID,
			Children:    buildCategoryTree(cat.Children),
		}
		result = append(result, item)
	}
	return result
}

func createCategoryHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Name        string     `json:"name" binding:"required"`
			Description string     `json:"description"`
			ParentID    *uuid.UUID `json:"parent_id"`
			SortOrder   int        `json:"sort_order"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		category := GORMCategory{
			ID:          uuid.New(),
			Name:        req.Name,
			Description: req.Description,
			ParentID:    req.ParentID,
			SortOrder:   req.SortOrder,
		}

		if err := db.Create(&category).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to create category"})
			return
		}

		c.JSON(201, gin.H{"category": category})
	}
}

func updateCategoryHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid category ID"})
			return
		}

		var req struct {
			Name        string     `json:"name"`
			Description string     `json:"description"`
			ParentID    *uuid.UUID `json:"parent_id"`
			SortOrder   int        `json:"sort_order"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var category GORMCategory
		if err := db.First(&category, "id = ?", id).Error; err != nil {
			c.JSON(404, gin.H{"error": "Category not found"})
			return
		}

		if req.Name != "" {
			category.Name = req.Name
		}
		if req.Description != "" {
			category.Description = req.Description
		}
		category.ParentID = req.ParentID
		if req.SortOrder > 0 {
			category.SortOrder = req.SortOrder
		}

		if err := db.Save(&category).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to update category"})
			return
		}

		c.JSON(200, gin.H{"category": category})
	}
}

func deleteCategoryHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid category ID"})
			return
		}

		// Check if category has children
		var count int64
		db.Model(&GORMCategory{}).Where("parent_id = ?", id).Count(&count)
		if count > 0 {
			c.JSON(400, gin.H{"error": "Cannot delete category with subcategories"})
			return
		}

		if err := db.Delete(&GORMCategory{}, "id = ?", id).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to delete category"})
			return
		}

		c.JSON(200, gin.H{"message": "Category deleted successfully"})
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

func listAttributesHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var attributes []GORMAttributeDefinition
		if err := db.Preload("Values", "is_active = ?", true).Where("is_active = ?", true).Order("display_order, name").Find(&attributes).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch attributes"})
			return
		}
		c.JSON(200, gin.H{"attributes": attributes})
	}
}

func getAttributeHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid attribute ID"})
			return
		}

		var attribute GORMAttributeDefinition
		if err := db.Preload("Values", "is_active = ?", true).First(&attribute, "id = ?", id).Error; err != nil {
			c.JSON(404, gin.H{"error": "Attribute not found"})
			return
		}
		c.JSON(200, gin.H{"attribute": attribute})
	}
}

func createAttributeHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreateAttributeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		attribute := GORMAttributeDefinition{
			ID:           uuid.New(),
			Name:         req.Name,
			Code:         strings.ToUpper(req.Code),
			Description:  req.Description,
			Type:         req.Type,
			IsRequired:   req.IsRequired,
			IsFilterable: req.IsFilterable,
			IsSearchable: req.IsSearchable,
			DisplayOrder: req.DisplayOrder,
			IsActive:     true,
		}

		if attribute.Type == "" {
			attribute.Type = "select"
		}

		if err := db.Create(&attribute).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to create attribute: " + err.Error()})
			return
		}

		c.JSON(201, gin.H{"attribute": attribute})
	}
}

func updateAttributeHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid attribute ID"})
			return
		}

		var req struct {
			Name         string `json:"name"`
			Description  string `json:"description"`
			Type         string `json:"type"`
			IsRequired   *bool  `json:"is_required"`
			IsFilterable *bool  `json:"is_filterable"`
			IsSearchable *bool  `json:"is_searchable"`
			DisplayOrder int    `json:"display_order"`
			IsActive     *bool  `json:"is_active"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var attribute GORMAttributeDefinition
		if err := db.First(&attribute, "id = ?", id).Error; err != nil {
			c.JSON(404, gin.H{"error": "Attribute not found"})
			return
		}

		if req.Name != "" {
			attribute.Name = req.Name
		}
		if req.Description != "" {
			attribute.Description = req.Description
		}
		if req.Type != "" {
			attribute.Type = req.Type
		}
		if req.IsRequired != nil {
			attribute.IsRequired = *req.IsRequired
		}
		if req.IsFilterable != nil {
			attribute.IsFilterable = *req.IsFilterable
		}
		if req.IsSearchable != nil {
			attribute.IsSearchable = *req.IsSearchable
		}
		if req.DisplayOrder > 0 {
			attribute.DisplayOrder = req.DisplayOrder
		}
		if req.IsActive != nil {
			attribute.IsActive = *req.IsActive
		}

		if err := db.Save(&attribute).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to update attribute"})
			return
		}

		c.JSON(200, gin.H{"attribute": attribute})
	}
}

func deleteAttributeHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid attribute ID"})
			return
		}

		if err := db.Delete(&GORMAttributeDefinition{}, "id = ?", id).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to delete attribute"})
			return
		}

		c.JSON(200, gin.H{"message": "Attribute deleted successfully"})
	}
}

func listAttributeValuesHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		attributeID, err := uuid.Parse(c.Query("attribute_id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid attribute ID"})
			return
		}

		var values []GORMAttributeValue
		if err := db.Where("attribute_id = ? AND is_active = ?", attributeID, true).Order("display_order, value").Find(&values).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch attribute values"})
			return
		}
		c.JSON(200, gin.H{"values": values})
	}
}

func createAttributeValueHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreateAttributeValueRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var attribute GORMAttributeDefinition
		if err := db.First(&attribute, "id = ?", req.AttributeID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Attribute not found"})
			return
		}

		value := GORMAttributeValue{
			ID:          uuid.New(),
			AttributeID: req.AttributeID,
			Value:       req.Value,
			Code:        strings.ToUpper(req.Code),
			SwatchColor: req.SwatchColor,
			SwatchImage: req.SwatchImage,
			DisplayOrder: req.DisplayOrder,
			IsActive:    true,
		}

		if err := db.Create(&value).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to create attribute value"})
			return
		}

		c.JSON(201, gin.H{"value": value})
	}
}

func updateAttributeValueHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid value ID"})
			return
		}

		var req struct {
			Value        string `json:"value"`
			Code         string `json:"code"`
			SwatchColor  string `json:"swatch_color"`
			SwatchImage  string `json:"swatch_image"`
			DisplayOrder int    `json:"display_order"`
			IsActive     *bool  `json:"is_active"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var value GORMAttributeValue
		if err := db.First(&value, "id = ?", id).Error; err != nil {
			c.JSON(404, gin.H{"error": "Attribute value not found"})
			return
		}

		if req.Value != "" {
			value.Value = req.Value
		}
		if req.Code != "" {
			value.Code = strings.ToUpper(req.Code)
		}
		if req.SwatchColor != "" {
			value.SwatchColor = req.SwatchColor
		}
		if req.SwatchImage != "" {
			value.SwatchImage = req.SwatchImage
		}
		if req.DisplayOrder > 0 {
			value.DisplayOrder = req.DisplayOrder
		}
		if req.IsActive != nil {
			value.IsActive = *req.IsActive
		}

		if err := db.Save(&value).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to update attribute value"})
			return
		}

		c.JSON(200, gin.H{"value": value})
	}
}

func deleteAttributeValueHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid value ID"})
			return
		}

		if err := db.Delete(&GORMAttributeValue{}, "id = ?", id).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to delete attribute value"})
			return
		}

		c.JSON(200, gin.H{"message": "Attribute value deleted successfully"})
	}
}

func listSKUSuffixRulesHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var rules []GORMSKUSuffixRule
		if err := db.Where("is_active = ?", true).Order("name").Find(&rules).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch SKU suffix rules"})
			return
		}
		c.JSON(200, gin.H{"rules": rules})
	}
}

func listBrandsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		status := c.Query("status")
		
		var brands []GORMBrand
		query := db.Order("name")
		
		if status != "" {
			query = query.Where("status = ?", status)
		}
		
		if err := query.Find(&brands).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch brands"})
			return
		}
		
		c.JSON(200, gin.H{"brands": brands})
	}
}

func getBrandHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid brand ID"})
			return
		}
		
		var brand GORMBrand
		if err := db.First(&brand, "id = ?", id).Error; err != nil {
			c.JSON(404, gin.H{"error": "Brand not found"})
			return
		}
		
		c.JSON(200, gin.H{"brand": brand})
	}
}

func createBrandHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreateBrandRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		
		slug := generateSlug(req.Name)
		
		brandCode := generateBrandCode(req.Name)
		
		brand := GORMBrand{
			ID:          uuid.New(),
			Name:        req.Name,
			Slug:        slug,
			BrandCode:   brandCode,
			LogoURL:     req.LogoURL,
			Description: req.Description,
			Tier:        req.Tier,
			Status:      "active",
		}
		
		if brand.Tier == "" {
			brand.Tier = "standard"
		}
		
		if err := db.Create(&brand).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to create brand: " + err.Error()})
			return
		}
		
		c.JSON(201, gin.H{"brand": brand})
	}
}

func updateBrandHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid brand ID"})
			return
		}
		
		var req struct {
			Name        string `json:"name"`
			LogoURL     string `json:"logo_url"`
			Description string `json:"description"`
			Tier        string `json:"tier"`
			Status      string `json:"status"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		
		var brand GORMBrand
		if err := db.First(&brand, "id = ?", id).Error; err != nil {
			c.JSON(404, gin.H{"error": "Brand not found"})
			return
		}
		
		if req.Name != "" {
			brand.Name = req.Name
			brand.BrandCode = generateBrandCode(req.Name)
		}
		if req.LogoURL != "" {
			brand.LogoURL = req.LogoURL
		}
		if req.Description != "" {
			brand.Description = req.Description
		}
		if req.Tier != "" {
			brand.Tier = req.Tier
		}
		if req.Status != "" {
			brand.Status = req.Status
		}
		
		if err := db.Save(&brand).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to update brand"})
			return
		}
		
		c.JSON(200, gin.H{"brand": brand})
	}
}

func deleteBrandHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid brand ID"})
			return
		}
		
		var count int64
		db.Model(&Product{}).Where("brand_id = ?", id).Count(&count)
		if count > 0 {
			c.JSON(400, gin.H{"error": "Cannot delete brand with associated products"})
			return
		}
		
		if err := db.Delete(&GORMBrand{}, "id = ?", id).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to delete brand"})
			return
		}
		
		c.JSON(200, gin.H{"message": "Brand deleted successfully"})
	}
}

func generateSlug(name string) string {
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, "&", "and")
	slug = strings.ReplaceAll(slug, "'", "")
	slug = strings.ReplaceAll(slug, "\"", "")
	slug = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return -1
	}, slug)
	return slug
}

func generateBrandCode(name string) string {
	words := strings.Fields(name)
	var code string
	for _, word := range words {
		if len(word) > 0 {
			code += strings.ToUpper(string(word[0]))
		}
	}
	if len(code) > 5 {
		code = code[:5]
	}
	return code
}

func createProductV2Handler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreateProductV2Request
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		
		sqlDB, err := db.DB()
		if err != nil {
			c.JSON(500, gin.H{"error": "Database connection error"})
			return
		}
		
		tx, err := sqlDB.Begin()
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to start transaction"})
			return
		}
		defer tx.Rollback()
		
		var brandCode string
		if req.BrandCode != "" {
			brandCode = req.BrandCode
		} else if req.BrandID != nil {
			var brand GORMBrand
			if err := db.First(&brand, "id = ?", req.BrandID).Error; err == nil {
				brandCode = brand.BrandCode
			}
		}
		
		status := req.Status
		if status == "" {
			status = "draft"
		}
		
		productID := uuid.New()
		now := time.Now()
		
		_, err = tx.Exec(`
			INSERT INTO products (id, name, description, price, brand_id, brand_code, category_id, vendor_id, stock, discount, status, is_active, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
			productID, req.Name, req.Description, req.Price, req.BrandID, brandCode,
			req.CategoryID, req.VendorID, req.Stock, req.Discount, status, true, now, now)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to create product: " + err.Error()})
			return
		}
		
		var variations []ProductVariation
		for _, vReq := range req.Variations {
			price := vReq.Price
			if price == 0 {
				price = req.Price
			}
			
			stock := vReq.Stock
			if stock == 0 {
				stock = req.Stock
			}
			
			sku := vReq.SKU
			if sku == "" {
				sku = GenerateSKU(SKUSettings{Prefix: brandCode, Strategy: "incremental"}, "")
				sku = EnsureUniqueSKUGORM(db, sku)
			}
			
			var attrsJSON []byte
			if vReq.Attributes != nil {
				attrsJSON, _ = json.Marshal(vReq.Attributes)
			} else {
				attrsJSON = []byte("{}")
			}
			
			var barcode interface{}
			if vReq.Barcode != "" {
				barcode = vReq.Barcode
			} else {
				barcode = nil
			}
			
			variationID := uuid.New()
			_, err = tx.Exec(`
				INSERT INTO product_variations (id, product_id, sku, barcode, attributes, price, stock, is_active, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
				variationID, productID, sku, barcode, attrsJSON, price, stock, true, now)
			if err != nil {
				c.JSON(500, gin.H{"error": "Failed to create variation: " + err.Error()})
				return
			}
			
			for _, attrValID := range vReq.AttributeValueIDs {
				var attrID uuid.UUID
				err := sqlDB.QueryRow("SELECT attribute_id FROM attribute_values WHERE id = $1", attrValID).Scan(&attrID)
				if err != nil {
					c.JSON(400, gin.H{"error": "Invalid attribute value ID: " + err.Error()})
					return
				}
				
				_, err = tx.Exec(`
					INSERT INTO product_variation_attribute_values (id, variation_id, attribute_id, attribute_value_id, created_at)
					VALUES ($1, $2, $3, $4, $5)`,
					uuid.New(), variationID, attrID, attrValID, now)
				if err != nil {
					c.JSON(500, gin.H{"error": "Failed to create variation attribute value: " + err.Error()})
					return
				}
			}
			
			variations = append(variations, ProductVariation{
				ID:         variationID,
				ProductID:  productID,
				SKU:        sku,
				Barcode:    vReq.Barcode,
				Attributes: vReq.Attributes,
				Price:      price,
				Stock:      stock,
				IsActive:   true,
				CreatedAt:  now,
			})
		}
		
		if err := tx.Commit(); err != nil {
			c.JSON(500, gin.H{"error": "Failed to commit transaction"})
			return
		}
		
		product := Product{
			ID:          productID,
			Name:        req.Name,
			Description: req.Description,
			Price:       req.Price,
			BrandID:     req.BrandID,
			BrandCode:   brandCode,
			CategoryID:  req.CategoryID,
			VendorID:    req.VendorID,
			Stock:       req.Stock,
			Discount:    req.Discount,
			Status:      status,
			IsActive:    true,
			Variations:  variations,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		
		c.JSON(201, gin.H{"product": product})
	}
}

func EnsureUniqueSKUGORM(db *gorm.DB, sku string) string {
	var count int64
	for {
		db.Model(&ProductVariation{}).Where("sku = ?", sku).Count(&count)
		if count == 0 {
			return sku
	}
		sku = sku + fmt.Sprintf("-%d", rand.Intn(100))
	}
}

func getActiveSuffix(db *gorm.DB) string {
	var rule GORMSKUSuffixRule
	if err := db.Where("is_active = ? AND (valid_from IS NULL OR valid_from <= ?) AND (valid_to IS NULL OR valid_to >= ?)",
		true, time.Now(), time.Now()).First(&rule).Error; err != nil {
		return "SS24"
	}
	return rule.Suffix
}

func generateSKUv3Handler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req GenerateSKURequestV3
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		
		suffix := req.Suffix
		if suffix == "" {
			suffix = getActiveSuffix(db)
		}
		
		sku := GenerateSKUv3(req.BrandCode, req.ProductCode, req.AttributeCodes, suffix)
		
		c.JSON(200, gin.H{"sku": sku})
	}
}

func GenerateSKUv3(brandCode, productCode string, attrCodes []string, suffix string) string {
	parts := []string{
		strings.ToUpper(brandCode),
		strings.ToUpper(productCode),
	}
	if len(attrCodes) > 0 {
		sorted := make([]string, len(attrCodes))
		copy(sorted, attrCodes)
		sort.Strings(sorted)
		parts = append(parts, strings.Join(sorted, "-"))
	}
	if suffix != "" {
		parts = append(parts, suffix)
	}
	return strings.Join(parts, "-")
}

func generateMatrixHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req GenerateMatrixRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		brandCode := req.BrandCode

		// Get attribute values for each selection
		var selectionsWithValues []struct {
			AttributeID   uuid.UUID
			AttributeCode string
			Values        []GORMAttributeValue
		}

		for _, sel := range req.Selections {
			var attrDef GORMAttributeDefinition
			if err := db.First(&attrDef, "id = ?", sel.AttributeID).Error; err != nil {
				continue
			}

			var values []GORMAttributeValue
			db.Where("id IN ? AND is_active = ?", sel.ValueIDs, true).Find(&values)

			selectionsWithValues = append(selectionsWithValues, struct {
				AttributeID   uuid.UUID
				AttributeCode string
				Values        []GORMAttributeValue
			}{
				AttributeID:   sel.AttributeID,
				AttributeCode: strings.ToUpper(attrDef.Code),
				Values:        values,
			})
		}

		// Generate Cartesian product
		var variations []ProductVariation
		generateCartesian(selectionsWithValues, 0, map[string]string{}, &variations, req.ProductCode, brandCode, req.Suffix)

		c.JSON(200, gin.H{
			"variations": variations,
			"count":      len(variations),
		})
	}
}

func generateCartesian(selections []struct {
	AttributeID   uuid.UUID
	AttributeCode string
	Values        []GORMAttributeValue
}, index int, current map[string]string, result *[]ProductVariation, productCode, brandCode, suffix string) {
	if index >= len(selections) {
		// Create a variation for this combination
		attrCodes := make([]string, 0, len(current))
		for _, v := range current {
			attrCodes = append(attrCodes, v)
		}

		sku := GenerateSKUv3(brandCode, productCode, attrCodes, suffix)

		variation := ProductVariation{
			ID:         uuid.New(),
			SKU:        sku,
			Attributes: copyMap(current),
			IsActive:   true,
		}
		*result = append(*result, variation)
		return
	}

	sel := selections[index]
	for _, val := range sel.Values {
		newMap := make(map[string]string)
		for k, v := range current {
			newMap[k] = v
		}
		newMap[sel.AttributeCode] = val.Code
		generateCartesian(selections, index+1, newMap, result, productCode, brandCode, suffix)
	}
}

func copyMap(m map[string]string) map[string]string {
	result := make(map[string]string)
	for k, v := range m {
		result[k] = v
	}
	return result
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

	// Connect to database with GORM for categories
	gormDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to GORM database: %v", err)
	}
	sqlDB, _ := gormDB.DB()
	defer sqlDB.Close()

	// Auto migrate categories and attributes
	gormDB.AutoMigrate(&GORMCategory{})
	gormDB.AutoMigrate(&GORMAttributeDefinition{})
	gormDB.AutoMigrate(&GORMAttributeValue{})
	gormDB.AutoMigrate(&GORMSKUSuffixRule{})
	gormDB.AutoMigrate(&GORMBrand{})
	gormDB.AutoMigrate(&GORMVariationAttributeValue{})
	
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
	r.GET("/products/categories/tree", listCategoriesTreeHandler(gormDB))
	r.GET("/brands", listBrandsHandler(gormDB))
	r.GET("/brands/:id", getBrandHandler(gormDB))
	
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

		// Categories (GORM)
		admin.POST("/categories", createCategoryHandler(gormDB))
		admin.PUT("/categories/:id", updateCategoryHandler(gormDB))
		admin.DELETE("/categories/:id", deleteCategoryHandler(gormDB))

		// Attributes
		admin.GET("/attributes", listAttributesHandler(gormDB))
		admin.GET("/attributes/:id", getAttributeHandler(gormDB))
		admin.POST("/attributes", createAttributeHandler(gormDB))
		admin.PUT("/attributes/:id", updateAttributeHandler(gormDB))
		admin.DELETE("/attributes/:id", deleteAttributeHandler(gormDB))

		// Attribute Values
		admin.GET("/attribute-values", listAttributeValuesHandler(gormDB))
		admin.POST("/attribute-values", createAttributeValueHandler(gormDB))
		admin.PUT("/attribute-values/:id", updateAttributeValueHandler(gormDB))
		admin.DELETE("/attribute-values/:id", deleteAttributeValueHandler(gormDB))

		// SKU Suffix Rules
		admin.GET("/sku-suffix-rules", listSKUSuffixRulesHandler(gormDB))

		// Brands (CRUD)
		admin.POST("/brands", createBrandHandler(gormDB))
		admin.PUT("/brands/:id", updateBrandHandler(gormDB))
		admin.DELETE("/brands/:id", deleteBrandHandler(gormDB))

		// Product V2 with transactional variation creation
		admin.POST("/v2", createProductV2Handler(gormDB))

		// SKU V3 with brand code
		admin.POST("/generate-sku-v3", generateSKUv3Handler(gormDB))

		// Generate matrix (Cartesian product of attribute values)
		admin.POST("/generate-matrix", generateMatrixHandler(gormDB))
	}
	
	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("Product service starting on %s", addr)
	r.Run(addr)
}

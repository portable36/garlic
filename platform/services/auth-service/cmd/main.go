package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
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

type JWTConfig struct {
	Secret            string
	Expiry            time.Duration
	RefreshTokenExpiry time.Duration
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{Port: getEnv("PORT", "8081")},
		Database: DatabaseConfig{
			Host: getEnv("DB_HOST", "postgres"), Port: 5432,
			User: getEnv("DB_USER", "postgres"), Password: getEnv("DB_PASSWORD", "postgres"),
			DBName: getEnv("DB_NAME", "auth_db"), SSLMode: "disable",
		},
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", "your-super-secret-jwt-key"),
			Expiry: 24 * time.Hour, RefreshTokenExpiry: 7 * 24 * time.Hour,
		},
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

	r.POST("/auth/register", registerHandler(db))
	r.POST("/auth/login", loginHandler(db, cfg.JWT.Secret, cfg.JWT.Expiry, cfg.JWT.RefreshTokenExpiry))
	r.POST("/auth/refresh", refreshHandler(cfg.JWT.Secret, cfg.JWT.Expiry, cfg.JWT.RefreshTokenExpiry))
	r.GET("/auth/me", authMiddleware(cfg.JWT.Secret), meHandler(db))

	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("Auth service starting on %s", addr)
	r.Run(addr)
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

type User struct {
	ID           uuid.UUID `db:"id"`
	Email        string    `db:"email"`
	PasswordHash string    `db:"password_hash"`
	RoleID       int       `db:"role_id"`
	CreatedAt    time.Time `db:"created_at"`
	UpdatedAt    time.Time `db:"updated_at"`
}

func registerHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Email    string `json:"email" binding:"required,email"`
			Password string `json:"password" binding:"required,min=6"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var existing User
		err := db.Get(&existing, "SELECT id FROM users WHERE email = $1", req.Email)
		if err == nil {
			c.JSON(409, gin.H{"error": "User already exists"})
			return
		}

		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

		user := User{
			ID: uuid.New(), Email: req.Email, PasswordHash: string(hashedPassword),
			RoleID: 2, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		}

		_, err = db.Exec("INSERT INTO users (id, email, password_hash, role_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
			user.ID, user.Email, user.PasswordHash, user.RoleID, user.CreatedAt, user.UpdatedAt)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to register user"})
			return
		}

		c.JSON(201, gin.H{"message": "User registered successfully"})
	}
}

func loginHandler(db *sqlx.DB, secret string, expiry, refreshExpiry time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Email    string `json:"email" binding:"required,email"`
			Password string `json:"password" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var user User
		err := db.Get(&user, "SELECT id, email, password_hash, role_id FROM users WHERE email = $1", req.Email)
		if err != nil {
			c.JSON(401, gin.H{"error": "Invalid credentials"})
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			c.JSON(401, gin.H{"error": "Invalid credentials"})
			return
		}

		accessToken, _ := generateToken(user.ID, user.Email, user.RoleID, secret, expiry)
		refreshToken, _ := generateToken(user.ID, user.Email, user.RoleID, secret, refreshExpiry)

		c.JSON(200, gin.H{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"token_type":    "Bearer",
			"user": gin.H{
				"id":      user.ID,
				"email":   user.Email,
				"role_id": user.RoleID,
			},
		})
	}
}

func refreshHandler(secret string, expiry, refreshExpiry time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			RefreshToken string `json:"refresh_token" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		claims := &jwt.RegisteredClaims{}
		token, err := jwt.ParseWithClaims(req.RefreshToken, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(401, gin.H{"error": "Invalid token"})
			return
		}

		userID, _ := uuid.Parse(claims.Subject)
		newAccessToken, _ := generateToken(userID, claims.Issuer, 2, secret, expiry)

		c.JSON(200, gin.H{
			"access_token": newAccessToken,
			"token_type":   "Bearer",
		})
	}
}

func authMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || len(authHeader) < 7 {
			c.JSON(401, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := authHeader[7:]
		claims := &jwt.RegisteredClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(401, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.Subject)
		c.Next()
	}
}

func meHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		if userID == "" {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			return
		}

		var user User
		err := db.Get(&user, "SELECT id, email, role_id, created_at FROM users WHERE id = $1", userID)
		if err != nil {
			c.JSON(404, gin.H{"error": "User not found"})
			return
		}

		c.JSON(200, gin.H{
			"id":         user.ID,
			"email":      user.Email,
			"role_id":    user.RoleID,
			"created_at": user.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}
}

func generateToken(userID uuid.UUID, email string, roleID int, secret string, expiry time.Duration) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   userID.String(),
		Issuer:    email,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

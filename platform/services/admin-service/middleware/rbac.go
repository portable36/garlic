package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AdminAuthMiddleware(secret string) gin.HandlerFunc {
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

		// Extract claims
		userID := claims.Subject
		email := claims.Issuer

		// Get role from custom claims if available
		roleID := 0
		if roleClaim, ok := claims["role_id"].(float64); ok {
			roleID = int(roleClaim)
		}

		c.Set("user_id", userID)
		c.Set("email", email)
		c.Set("role_id", roleID)
		c.Next()
	}
}

func RequirePermission(permissionsDB func(roleID int) ([]string, error), requiredPermission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleID := c.GetInt("role_id")
		if roleID == 0 {
			c.JSON(403, gin.H{"error": "Role not found"})
			c.Abort()
			return
		}

		perms, err := permissionsDB(roleID)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to get permissions"})
			c.Abort()
			return
		}

		hasPermission := false
		for _, p := range perms {
			if p == requiredPermission || p == "super_admin" {
				hasPermission = true
				break
			}
		}

		if !hasPermission {
			c.JSON(403, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}

func GetClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header first
	 forwardedFor := c.GetHeader("X-Forwarded-For")
	if forwardedFor != "" {
		ips := strings.Split(forwardedFor, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Fallback to X-Real-IP
	if realIP := c.GetHeader("X-Real-IP"); realIP != "" {
		return realIP
	}

	// Last resort
	return c.ClientIP()
}

func JSONMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Content-Type", "application/json")
		c.Next()
	}
}

func RecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Internal server error",
				})
			}
		}()
		c.Next()
	}
}

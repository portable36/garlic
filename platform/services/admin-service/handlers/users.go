package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/garlic/admin-service/models"
)

func ValidateHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		email := c.GetString("email")
		roleID := c.GetInt("role_id")

		if userID == "" {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			return
		}

		// Get permissions for role
		var permissions []models.Permission
		err := db.Select(&permissions, `
			SELECT p.id, p.name, p.description, p.created_at
			FROM permissions p
			JOIN role_permissions rp ON p.id = rp.permission_id
			WHERE rp.role_id = $1
		`, roleID)
		if err != nil {
			permissions = []models.Permission{}
		}

		// Check if user is banned
		var banReason string
		db.Get(&banReason, `SELECT reason FROM user_bans WHERE user_id = $1`, userID)

		c.JSON(200, gin.H{
			"user": gin.H{
				"id":         userID,
				"email":      email,
				"role_id":    roleID,
				"is_banned":  banReason != "",
				"ban_reason": banReason,
			},
			"permissions": permissions,
		})
	}
}

func ListUsersHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		page := c.DefaultQuery("page", "1")
		limit := c.DefaultQuery("limit", "20")
		search := c.Query("search")

		var offset int
		_, err := fmt.Sscanf(page, "%d", &offset)
		if err != nil {
			offset = 0
		}
		offset = (offset - 1) * 20

		var limitInt int
		_, err = fmt.Sscanf(limit, "%d", &limitInt)
		if err != nil {
			limitInt = 20
		}

		var users []models.UserWithRole
		query := `
			SELECT 
				u.id, u.email, COALESCE(ur.role_id, u.role_id) as role_id,
				r.name as role_name,
				ub.reason IS NOT NULL as is_banned,
				COALESCE(ub.reason, '') as ban_reason,
				u.created_at
			FROM auth_db.users u
			LEFT JOIN admin_db.roles r ON r.id = COALESCE(ur.role_id, u.role_id)
			LEFT JOIN admin_db.user_roles ur ON u.id = ur.user_id
			LEFT JOIN admin_db.user_bans ub ON u.id = ub.user_id
		`

		args := []interface{}{}
		if search != "" {
			query += " WHERE u.email ILIKE $1"
			args = append(args, "%"+search+"%")
		}

		query += " ORDER BY u.created_at DESC LIMIT $" + string(rune('1'+len(args))) + " OFFSET $" + string(rune('2'+len(args)))
		args = append(args, limitInt, offset)

		err = db.Select(&users, query, args...)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch users"})
			return
		}

		var total int
		db.Get(&total, "SELECT COUNT(*) FROM auth_db.users")

		c.JSON(200, gin.H{
			"users": users,
			"total": total,
			"page":  page,
			"limit": limit,
		})
	}
}

func GetUserHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")

		var user models.UserWithRole
		err := db.Get(&user, `
			SELECT 
				u.id, u.email, COALESCE(ur.role_id, u.role_id) as role_id,
				r.name as role_name,
				ub.reason IS NOT NULL as is_banned,
				COALESCE(ub.reason, '') as ban_reason,
				u.created_at
			FROM auth_db.users u
			LEFT JOIN admin_db.roles r ON r.id = COALESCE(ur.role_id, u.role_id)
			LEFT JOIN admin_db.user_roles ur ON u.id = ur.user_id
			LEFT JOIN admin_db.user_bans ub ON u.id = ub.user_id
			WHERE u.id = $1
		`, userID)
		if err != nil {
			c.JSON(404, gin.H{"error": "User not found"})
			return
		}

		c.JSON(200, gin.H{"user": user})
	}
}

func AssignRoleHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")

		var req struct {
			RoleID int `json:"role_id" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		currentUserID := c.GetString("user_id")
		currentUserUUID, _ := uuid.Parse(currentUserID)
		userUUID, _ := uuid.Parse(userID)

		// Delete existing roles
		_, err := db.Exec("DELETE FROM admin_db.user_roles WHERE user_id = $1", userID)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to update role"})
			return
		}

		// Insert new role
		_, err = db.Exec(`
			INSERT INTO admin_db.user_roles (user_id, role_id, assigned_at, assigned_by)
			VALUES ($1, $2, $3, $4)
		`, userUUID, req.RoleID, time.Now(), currentUserUUID)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to assign role"})
			return
		}

		// Log action
		logAction(db, userUUID, "assign_role", "user", userID, map[string]interface{}{"role_id": req.RoleID}, c)

		c.JSON(200, gin.H{"message": "Role assigned successfully"})
	}
}

func BanUserHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")

		var req struct {
			Reason string `json:"reason" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		currentUserID := c.GetString("user_id")
		currentUserUUID, _ := uuid.Parse(currentUserID)
		userUUID, _ := uuid.Parse(userID)

		_, err := db.Exec(`
			INSERT INTO admin_db.user_bans (user_id, banned_at, banned_by, reason)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (user_id) DO UPDATE SET reason = $4, banned_at = $2, banned_by = $3
		`, userUUID, time.Now(), currentUserUUID, req.Reason)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to ban user"})
			return
		}

		logAction(db, userUUID, "ban_user", "user", userID, map[string]interface{}{"reason": req.Reason}, c)

		c.JSON(200, gin.H{"message": "User banned successfully"})
	}
}

func UnbanUserHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")

		currentUserID := c.GetString("user_id")
		currentUserUUID, _ := uuid.Parse(currentUserID)
		userUUID, _ := uuid.Parse(userID)

		_, err := db.Exec("DELETE FROM admin_db.user_bans WHERE user_id = $1", userUUID)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to unban user"})
			return
		}

		logAction(db, userUUID, "unban_user", "user", userID, nil, c)

		c.JSON(200, gin.H{"message": "User unbanned successfully"})
	}
}

func logAction(db *sqlx.DB, userID uuid.UUID, action, entityType, entityID string, details map[string]interface{}, c *gin.Context) {
	detailsJSON, _ := json.Marshal(details)
	ipAddress := c.ClientIP()
	userAgent := c.Request.UserAgent()

	db.Exec(`
		INSERT INTO admin_db.audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, userID, action, entityType, entityID, string(detailsJSON), ipAddress, userAgent, time.Now())
}

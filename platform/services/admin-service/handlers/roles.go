package handlers

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"

	"github.com/garlic/admin-service/models"
)

func ListRolesHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var roles []models.RoleWithPermissions
		query := `
			SELECT r.id, r.name, r.description, r.created_at
			FROM admin_db.roles r
			ORDER BY r.id
		`
		err := db.Select(&roles, query)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch roles"})
			return
		}

		// Get permissions for each role
		for i := range roles {
			var perms []models.Permission
			db.Select(&perms, `
				SELECT p.id, p.name, p.description, p.created_at
				FROM admin_db.permissions p
				JOIN admin_db.role_permissions rp ON p.id = rp.permission_id
				WHERE rp.role_id = $1
			`, roles[i].ID)
			roles[i].Permissions = perms
		}

		c.JSON(200, gin.H{"roles": roles})
	}
}

func GetRoleHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleID := c.Param("id")

		var role models.RoleWithPermissions
		err := db.Get(&role, `
			SELECT id, name, description, created_at
			FROM admin_db.roles
			WHERE id = $1
		`, roleID)
		if err != nil {
			c.JSON(404, gin.H{"error": "Role not found"})
			return
		}

		var perms []models.Permission
		db.Select(&perms, `
			SELECT p.id, p.name, p.description, p.created_at
			FROM admin_db.permissions p
			JOIN admin_db.role_permissions rp ON p.id = rp.permission_id
			WHERE rp.role_id = $1
		`, roleID)
		role.Permissions = perms

		c.JSON(200, gin.H{"role": role})
	}
}

func CreateRoleHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Name        string `json:"name" binding:"required"`
			Description string `json:"description"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var role models.Role
		err := db.Get(&role, `
			INSERT INTO admin_db.roles (name, description, created_at)
			VALUES ($1, $2, $3)
			RETURNING id, name, description, created_at
		`, req.Name, req.Description, time.Now())
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to create role"})
			return
		}

		c.JSON(201, gin.H{"role": role})
	}
}

func UpdateRolePermissionsHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleID := c.Param("id")

		var req struct {
			Permissions []int `json:"permissions" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// Delete existing permissions
		_, err := db.Exec("DELETE FROM admin_db.role_permissions WHERE role_id = $1", roleID)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to update permissions"})
			return
		}

		// Insert new permissions
		for _, permID := range req.Permissions {
			_, err = db.Exec(`
				INSERT INTO admin_db.role_permissions (role_id, permission_id)
				VALUES ($1, $2)
				ON CONFLICT DO NOTHING
			`, roleID, permID)
			if err != nil {
				c.JSON(500, gin.H{"error": "Failed to assign permission"})
				return
			}
		}

		c.JSON(200, gin.H{"message": "Permissions updated successfully"})
	}
}

func DeleteRoleHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleID := c.Param("id")

		// Don't allow deleting system roles
		if roleID == "1" || roleID == "2" || roleID == "3" || roleID == "4" {
			c.JSON(400, gin.H{"error": "Cannot delete system role"})
			return
		}

		_, err := db.Exec("DELETE FROM admin_db.roles WHERE id = $1", roleID)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to delete role"})
			return
		}

		c.JSON(200, gin.H{"message": "Role deleted successfully"})
	}
}

func ListPermissionsHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var permissions []models.Permission
		err := db.Select(&permissions, "SELECT id, name, description, created_at FROM admin_db.permissions ORDER BY id")
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch permissions"})
			return
		}

		c.JSON(200, gin.H{"permissions": permissions})
	}
}

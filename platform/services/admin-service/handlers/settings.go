package handlers

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"

	"github.com/garlic/admin-service/models"
)

func ListSettingsHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		group := c.Query("group")

		var settings []models.Setting
		query := "SELECT id, setting_key, setting_value, setting_type, setting_group, is_public, created_at, updated_at FROM admin_db.settings"
		args := []interface{}{}

		if group != "" {
			query += " WHERE setting_group = $1"
			args = append(args, group)
		}

		query += " ORDER BY setting_group, setting_key"

		err := db.Select(&settings, query, args...)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch settings"})
			return
		}

		// Group settings
		grouped := make(map[string][]models.Setting)
		for _, s := range settings {
			grouped[s.SettingGroup] = append(grouped[s.SettingGroup], s)
		}

		c.JSON(200, gin.H{
			"settings": settings,
			"grouped":  grouped,
		})
	}
}

func GetSettingHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.Param("key")

		var setting models.Setting
		err := db.Get(&setting, `
			SELECT id, setting_key, setting_value, setting_type, setting_group, is_public, created_at, updated_at
			FROM admin_db.settings WHERE setting_key = $1
		`, key)
		if err != nil {
			c.JSON(404, gin.H{"error": "Setting not found"})
			return
		}

		c.JSON(200, gin.H{"setting": setting})
	}
}

func UpdateSettingHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Key   string `json:"key" binding:"required"`
			Value string `json:"value" binding:"required"`
			Type  string `json:"type"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		settingType := req.Type
		if settingType == "" {
			// Try to infer type
			var existing models.Setting
			err := db.Get(&existing, "SELECT setting_type FROM admin_db.settings WHERE setting_key = $1", req.Key)
			if err == nil {
				settingType = existing.SettingType
			}
		}

		_, err := db.Exec(`
			INSERT INTO admin_db.settings (setting_key, setting_value, setting_type, updated_at)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, setting_type = COALESCE($3, settings.setting_type), updated_at = $4
		`, req.Key, req.Value, settingType, time.Now())
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to update setting"})
			return
		}

		c.JSON(200, gin.H{"message": "Setting updated successfully"})
	}
}

func BatchUpdateSettingsHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Settings map[string]string `json:"settings" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		tx, err := db.Beginx()
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to start transaction"})
			return
		}
		defer tx.Rollback()

		for key, value := range req.Settings {
			_, err = tx.Exec(`
				INSERT INTO admin_db.settings (setting_key, setting_value, updated_at)
				VALUES ($1, $2, $3)
				ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = $3
			`, key, value, time.Now())
			if err != nil {
				c.JSON(500, gin.H{"error": "Failed to update settings"})
				return
			}
		}

		if err := tx.Commit(); err != nil {
			c.JSON(500, gin.H{"error": "Failed to commit transaction"})
			return
		}

		c.JSON(200, gin.H{"message": "Settings updated successfully"})
	}
}

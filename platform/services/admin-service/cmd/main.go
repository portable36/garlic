package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"

	"github.com/garlic/admin-service/config"
	"github.com/garlic/admin-service/handlers"
	"github.com/garlic/admin-service/middleware"
)

func main() {
	cfg := config.Load()

	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host, cfg.Database.Port, cfg.Database.User,
		cfg.Database.Password, cfg.Database.DBName, cfg.Database.SSLMode)

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("Connected to database")

	r := gin.Default()

	r.Use(middleware.JSONMiddleware())
	r.Use(middleware.RecoveryMiddleware())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	admin := r.Group("/admin")
	admin.Use(middleware.AdminAuthMiddleware(cfg.JWT.Secret))
	{
		admin.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok", "service": "admin-service"})
		})

		admin.GET("/validate", handlers.ValidateHandler(db))

		admin.GET("/analytics", handlers.AnalyticsHandler(db))
		admin.GET("/audit-logs", handlers.ListAuditLogsHandler(db))

		admin.GET("/settings", handlers.ListSettingsHandler(db))
		admin.GET("/settings/:key", handlers.GetSettingHandler(db))
		admin.PUT("/settings", handlers.UpdateSettingHandler(db))
		admin.PUT("/settings/batch", handlers.BatchUpdateSettingsHandler(db))

		users := admin.Group("/users")
		{
			users.GET("", handlers.ListUsersHandler(db))
			users.GET("/:id", handlers.GetUserHandler(db))
			users.POST("/:id/role", handlers.AssignRoleHandler(db))
			users.POST("/:id/ban", handlers.BanUserHandler(db))
			users.POST("/:id/unban", handlers.UnbanUserHandler(db))
		}

		roles := admin.Group("/roles")
		{
			roles.GET("", handlers.ListRolesHandler(db))
			roles.GET("/:id", handlers.GetRoleHandler(db))
			roles.POST("", handlers.CreateRoleHandler(db))
			roles.PUT("/:id/permissions", handlers.UpdateRolePermissionsHandler(db))
			roles.DELETE("/:id", handlers.DeleteRoleHandler(db))
		}

		admin.GET("/permissions", handlers.ListPermissionsHandler(db))

		vendors := admin.Group("/vendors")
		{
			vendors.GET("", handlers.ListVendorsHandler(db))
			vendors.POST("/:id/approve", handlers.ApproveVendorHandler(db))
			vendors.POST("/:id/reject", handlers.RejectVendorHandler(db))
		}

		reviews := admin.Group("/reviews")
		{
			reviews.GET("", handlers.ListReviewsHandler(db))
			reviews.POST("/:id/approve", handlers.ApproveReviewHandler(db))
			reviews.POST("/:id/reject", handlers.RejectReviewHandler(db))
		}
	}

	log.Printf("Admin service starting on :%s", cfg.Server.Port)
	log.Fatal(r.Run(":" + cfg.Server.Port))
}

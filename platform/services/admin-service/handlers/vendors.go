package handlers

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/garlic/admin-service/models"
)

func ListVendorsHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		status := c.Query("status")

		var vendors []models.Vendor
		query := `
			SELECT v.id, v.user_id, v.store_name, v.description, v.logo_url,
			       v.status, v.approved_at, v.approved_by, v.created_at, v.updated_at,
			       u.email as user_email
			FROM admin_db.vendors v
			JOIN auth_db.users u ON v.user_id = u.id
		`

		args := []interface{}{}
		if status != "" {
			query += " WHERE v.status = $1"
			args = append(args, status)
		}

		query += " ORDER BY v.created_at DESC"

		err := db.Select(&vendors, query, args...)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch vendors"})
			return
		}

		c.JSON(200, gin.H{"vendors": vendors})
	}
}

func ApproveVendorHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorID := c.Param("id")

		currentUserID := c.GetString("user_id")
		currentUserUUID, _ := uuid.Parse(currentUserID)

		_, err := db.Exec(`
			UPDATE admin_db.vendors
			SET status = 'approved', approved_at = $1, approved_by = $2
			WHERE id = $3
		`, time.Now(), currentUserUUID, vendorID)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to approve vendor"})
			return
		}

		logAction(db, currentUserUUID, "approve_vendor", "vendor", vendorID, nil, c)

		c.JSON(200, gin.H{"message": "Vendor approved successfully"})
	}
}

func RejectVendorHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		vendorID := c.Param("id")

		currentUserID := c.GetString("user_id")
		currentUserUUID, _ := uuid.Parse(currentUserID)

		_, err := db.Exec(`
			UPDATE admin_db.vendors
			SET status = 'rejected', approved_at = $1, approved_by = $2
			WHERE id = $3
		`, time.Now(), currentUserUUID, vendorID)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to reject vendor"})
			return
		}

		logAction(db, currentUserUUID, "reject_vendor", "vendor", vendorID, nil, c)

		c.JSON(200, gin.H{"message": "Vendor rejected successfully"})
	}
}

func ListReviewsHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		status := c.Query("status")

		var reviews []models.Review
		query := `
			SELECT r.id, r.product_id, r.user_id, r.rating, r.comment, r.status, r.created_at,
			       p.name as product_name, u.email as user_email
			FROM admin_db.reviews r
			JOIN product_db.products p ON r.product_id = p.id
			JOIN auth_db.users u ON r.user_id = u.id
		`

		args := []interface{}{}
		if status != "" {
			query += " WHERE r.status = $1"
			args = append(args, status)
		}

		query += " ORDER BY r.created_at DESC"

		err := db.Select(&reviews, query, args...)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch reviews"})
			return
		}

		c.JSON(200, gin.H{"reviews": reviews})
	}
}

func ApproveReviewHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		reviewID := c.Param("id")

		_, err := db.Exec(`
			UPDATE admin_db.reviews SET status = 'approved' WHERE id = $1
		`, reviewID)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to approve review"})
			return
		}

		currentUserID := c.GetString("user_id")
		currentUserUUID, _ := uuid.Parse(currentUserID)
		logAction(db, currentUserUUID, "approve_review", "review", reviewID, nil, c)

		c.JSON(200, gin.H{"message": "Review approved successfully"})
	}
}

func RejectReviewHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		reviewID := c.Param("id")

		_, err := db.Exec(`
			UPDATE admin_db.reviews SET status = 'rejected' WHERE id = $1
		`, reviewID)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to reject review"})
			return
		}

		currentUserID := c.GetString("user_id")
		currentUserUUID, _ := uuid.Parse(currentUserID)
		logAction(db, currentUserUUID, "reject_review", "review", reviewID, nil, c)

		c.JSON(200, gin.H{"message": "Review rejected successfully"})
	}
}

package handlers

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"

	"github.com/garlic/admin-service/models"
)

func AnalyticsHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		period := c.DefaultQuery("period", "30")

		var days int
		_, err := fmt.Sscanf(period, "%d", &days)
		if err != nil {
			days = 30
		}

		analytics := models.Analytics{}

		// Total users
		db.Get(&analytics.TotalUsers, "SELECT COUNT(*) FROM auth_db.users")

		// Total products
		db.Get(&analytics.TotalProducts, "SELECT COUNT(*) FROM product_db.products WHERE is_active = true")

		// Total orders
		db.Get(&analytics.TotalOrders, "SELECT COUNT(*) FROM order_db.orders")

		// Total revenue
		db.Get(&analytics.TotalRevenue, "SELECT COALESCE(SUM(total_amount), 0) FROM order_db.orders WHERE payment_status = 'completed'")

		// Pending orders
		db.Get(&analytics.PendingOrders, "SELECT COUNT(*) FROM order_db.orders WHERE status = 'pending'")

		// Completed orders
		db.Get(&analytics.CompletedOrders, "SELECT COUNT(*) FROM order_db.orders WHERE status = 'completed'")

		// Recent orders
		var recentOrders []models.OrderSummary
		err = db.Select(&recentOrders, `
			SELECT o.id, u.email as user_email, o.total_amount, o.status, o.created_at
			FROM order_db.orders o
			JOIN auth_db.users u ON o.user_id = u.id
			ORDER BY o.created_at DESC
			LIMIT 10
		`)
		if err == nil {
			analytics.RecentOrders = recentOrders
		}

		// Sales by day
		var salesByDay []models.DailySales
		err = db.Select(&salesByDay, `
			SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, SUM(total_amount) as amount
			FROM order_db.orders
			WHERE created_at >= $1 AND payment_status = 'completed'
			GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
			ORDER BY date DESC
			LIMIT $2
		`, time.Now().AddDate(0, 0, -days), days)
		if err == nil {
			analytics.SalesByDay = salesByDay
		}

		c.JSON(200, gin.H{"analytics": analytics})
	}
}

func ListAuditLogsHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		page := c.DefaultQuery("page", "1")
		limit := c.DefaultQuery("limit", "50")
		userID := c.Query("user_id")
		action := c.Query("action")

		var offset int
		_, err := fmt.Sscanf(page, "%d", &offset)
		if err != nil {
			offset = 0
		}
		offset = (offset - 1) * 50

		var limitInt int
		_, err = fmt.Sscanf(limit, "%d", &limitInt)
		if err != nil {
			limitInt = 50
		}

		query := `
			SELECT al.id, al.user_id, al.action, al.entity_type, al.entity_id,
			       al.details, al.ip_address, al.user_agent, al.created_at,
			       u.email as user_email
			FROM admin_db.audit_logs al
			LEFT JOIN auth_db.users u ON al.user_id = u.id
			WHERE 1=1
		`

		args := []interface{}{}
		argNum := 1

		if userID != "" {
			query += " AND al.user_id = $" + string(rune('0'+argNum))
			args = append(args, userID)
			argNum++
		}

		if action != "" {
			query += " AND al.action = $" + string(rune('0'+argNum))
			args = append(args, action)
			argNum++
		}

		query += " ORDER BY al.created_at DESC LIMIT $" + string(rune('0'+argNum)) + " OFFSET $" + string(rune('1'+argNum))
		args = append(args, limitInt, offset)

		var logs []models.AuditLog
		err = db.Select(&logs, query, args...)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch audit logs"})
			return
		}

		var total int
		db.Get(&total, "SELECT COUNT(*) FROM admin_db.audit_logs")

		c.JSON(200, gin.H{
			"logs":  logs,
			"total": total,
			"page":  page,
			"limit": limit,
		})
	}
}

package com.garlic.order.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {
    private Long id;
    private String orderNumber;
    private Long userId;
    private String userEmail;
    private String status;
    private String paymentStatus;
    private List<OrderItemResponse> items;
    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal shippingAmount;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private String shippingAddress;
    private String billingAddress;
    private String shippingMethod;
    private String trackingNumber;
    private String paymentMethod;
    private String paymentTransactionId;
    private String notes;
    private String createdAt;
    private String updatedAt;
    private String shippedAt;
    private String deliveredAt;
    private String cancelledAt;
    private String cancellationReason;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderItemResponse {
        private Long id;
        private Long productId;
        private String productName;
        private String productSku;
        private Integer quantity;
        private BigDecimal price;
        private BigDecimal discount;
        private BigDecimal total;
    }
}

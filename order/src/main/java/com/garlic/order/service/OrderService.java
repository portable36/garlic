package com.garlic.order.service;

import com.garlic.order.dto.CreateOrderRequest;
import com.garlic.order.dto.OrderResponse;
import com.garlic.order.entity.Order;
import com.garlic.order.entity.OrderItem;
import com.garlic.order.exception.BadRequestException;
import com.garlic.order.exception.ResourceNotFoundException;
import com.garlic.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        Order order = Order.builder()
                .orderNumber(generateOrderNumber())
                .userId(request.getUserId())
                .userEmail(request.getUserEmail())
                .status(Order.OrderStatus.PENDING)
                .paymentStatus(Order.PaymentStatus.PENDING)
                .shippingAddress(request.getShippingAddress())
                .billingAddress(request.getBillingAddress() != null ? request.getBillingAddress() : request.getShippingAddress())
                .shippingMethod(request.getShippingMethod())
                .paymentMethod(request.getPaymentMethod())
                .taxAmount(request.getTaxAmount() != null ? request.getTaxAmount() : BigDecimal.ZERO)
                .shippingAmount(request.getShippingCost() != null ? request.getShippingCost() : BigDecimal.ZERO)
                .discountAmount(request.getDiscountAmount() != null ? request.getDiscountAmount() : BigDecimal.ZERO)
                .build();

        for (CreateOrderRequest.OrderItemRequest itemRequest : request.getItems()) {
            OrderItem item = OrderItem.builder()
                    .productId(itemRequest.getProductId())
                    .productName(itemRequest.getProductName())
                    .productSku(itemRequest.getProductSku())
                    .quantity(itemRequest.getQuantity())
                    .price(itemRequest.getPrice())
                    .discount(itemRequest.getDiscount())
                    .build();
            item.calculateTotal();
            order.addItem(item);
        }

        order.calculateTotal();
        order = orderRepository.save(order);

        publishOrderCreatedEvent(order);

        return mapToResponse(order);
    }

    public OrderResponse getOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        return mapToResponse(order);
    }

    public OrderResponse getOrderByNumber(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderNumber));
        return mapToResponse(order);
    }

    public Page<OrderResponse> getUserOrders(Long userId, Pageable pageable) {
        return orderRepository.findByUserId(userId, pageable).map(this::mapToResponse);
    }

    public Page<OrderResponse> getOrdersByStatus(Order.OrderStatus status, Pageable pageable) {
        return orderRepository.findByStatus(status, pageable).map(this::mapToResponse);
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long id, Order.OrderStatus newStatus) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        if (order.getStatus() == Order.OrderStatus.CANCELLED) {
            throw new BadRequestException("Cannot update a cancelled order");
        }

        order.setStatus(newStatus);

        if (newStatus == Order.OrderStatus.SHIPPED) {
            order.setShippedAt(LocalDateTime.now());
        } else if (newStatus == Order.OrderStatus.DELIVERED) {
            order.setDeliveredAt(LocalDateTime.now());
        } else if (newStatus == Order.OrderStatus.CANCELLED) {
            order.setCancelledAt(LocalDateTime.now());
            publishOrderCancelledEvent(order);
        }

        order = orderRepository.save(order);
        publishOrderStatusChangedEvent(order);

        return mapToResponse(order);
    }

    @Transactional
    public OrderResponse updatePaymentStatus(Long id, Order.PaymentStatus paymentStatus, String transactionId) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        order.setPaymentStatus(paymentStatus);
        if (transactionId != null) {
            order.setPaymentTransactionId(transactionId);
        }

        if (paymentStatus == Order.PaymentStatus.CAPTURED) {
            order.setStatus(Order.OrderStatus.CONFIRMED);
            publishOrderConfirmedEvent(order);
        } else if (paymentStatus == Order.PaymentStatus.FAILED) {
            order.setStatus(Order.OrderStatus.CANCELLED);
            order.setCancellationReason("Payment failed");
            order.setCancelledAt(LocalDateTime.now());
        }

        order = orderRepository.save(order);
        return mapToResponse(order);
    }

    private String generateOrderNumber() {
        return "ORD-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private OrderResponse mapToResponse(Order order) {
        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .userId(order.getUserId())
                .userEmail(order.getUserEmail())
                .status(order.getStatus().name())
                .paymentStatus(order.getPaymentStatus().name())
                .items(order.getItems().stream().map(item -> OrderResponse.OrderItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProductId())
                        .productName(item.getProductName())
                        .productSku(item.getProductSku())
                        .quantity(item.getQuantity())
                        .price(item.getPrice())
                        .discount(item.getDiscount())
                        .total(item.getTotal())
                        .build()).toList())
                .subtotal(order.getSubtotal())
                .taxAmount(order.getTaxAmount())
                .shippingAmount(order.getShippingAmount())
                .discountAmount(order.getDiscountAmount())
                .totalAmount(order.getTotalAmount())
                .shippingAddress(order.getShippingAddress())
                .billingAddress(order.getBillingAddress())
                .shippingMethod(order.getShippingMethod())
                .trackingNumber(order.getTrackingNumber())
                .paymentMethod(order.getPaymentMethod())
                .paymentTransactionId(order.getPaymentTransactionId())
                .notes(order.getNotes())
                .createdAt(order.getCreatedAt() != null ? order.getCreatedAt().toString() : null)
                .updatedAt(order.getUpdatedAt() != null ? order.getUpdatedAt().toString() : null)
                .shippedAt(order.getShippedAt() != null ? order.getShippedAt().toString() : null)
                .deliveredAt(order.getDeliveredAt() != null ? order.getDeliveredAt().toString() : null)
                .cancelledAt(order.getCancelledAt() != null ? order.getCancelledAt().toString() : null)
                .cancellationReason(order.getCancellationReason())
                .build();
    }

    private void publishOrderCreatedEvent(Order order) {
        publishEvent("ORDER_CREATED", order);
    }

    private void publishOrderConfirmedEvent(Order order) {
        publishEvent("ORDER_CONFIRMED", order);
    }

    private void publishOrderCancelledEvent(Order order) {
        publishEvent("ORDER_CANCELLED", order);
    }

    private void publishOrderStatusChangedEvent(Order order) {
        publishEvent("ORDER_STATUS_CHANGED", order);
    }

    private void publishEvent(String eventType, Order order) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("eventType", eventType);
            event.put("orderId", order.getId());
            event.put("orderNumber", order.getOrderNumber());
            event.put("userId", order.getUserId());
            event.put("status", order.getStatus().name());
            event.put("totalAmount", order.getTotalAmount());
            event.put("timestamp", System.currentTimeMillis());
            event.put("correlationId", UUID.randomUUID().toString());
            kafkaTemplate.send("order.created", event);
        } catch (Exception e) {
        }
    }
}

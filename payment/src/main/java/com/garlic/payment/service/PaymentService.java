package com.garlic.payment.service;

import com.garlic.payment.dto.PaymentRequest;
import com.garlic.payment.dto.PaymentResponse;
import com.garlic.payment.entity.Payment;
import com.garlic.payment.exception.BadRequestException;
import com.garlic.payment.exception.ResourceNotFoundException;
import com.garlic.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional
    public PaymentResponse processPayment(PaymentRequest request) {
        if (paymentRepository.existsByOrderId(request.getOrderId())) {
            throw new BadRequestException("Payment already exists for order " + request.getOrderId());
        }

        Payment payment = Payment.builder()
                .orderId(request.getOrderId())
                .amount(request.getAmount())
                .method(request.getMethod())
                .status(Payment.PaymentStatus.PROCESSING)
                .build();

        payment = paymentRepository.save(payment);

        PaymentResponse result = processWithGateway(payment);

        payment.setStatus(result.getStatus().equals("COMPLETED") 
            ? Payment.PaymentStatus.COMPLETED 
            : Payment.PaymentStatus.FAILED);
        payment.setTransactionId(result.getTransactionId());
        payment.setGatewayResponse(result.getGatewayResponse());
        
        if (result.getFailureReason() != null) {
            payment.setFailureReason(result.getFailureReason());
        }

        payment = paymentRepository.save(payment);

        publishPaymentEvent("PAYMENT_PROCESSED", payment);

        return mapToResponse(payment);
    }

    private PaymentResponse processWithGateway(Payment payment) {
        String transactionId = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        
        boolean success = Math.random() > 0.1;

        return PaymentResponse.builder()
                .transactionId(transactionId)
                .status(success ? "COMPLETED" : "FAILED")
                .gatewayResponse("Payment processed at " + System.currentTimeMillis())
                .failureReason(success ? null : "Insufficient funds")
                .build();
    }

    @Transactional
    public PaymentResponse refund(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + paymentId));

        if (payment.getStatus() != Payment.PaymentStatus.COMPLETED) {
            throw new BadRequestException("Only completed payments can be refunded");
        }

        payment.setStatus(Payment.PaymentStatus.REFUNDED);
        payment.setTransactionId("REF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        
        payment = paymentRepository.save(payment);

        publishPaymentEvent("PAYMENT_REFUNDED", payment);

        return mapToResponse(payment);
    }

    public PaymentResponse getPayment(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
        return mapToResponse(payment);
    }

    public PaymentResponse getPaymentByOrderId(Long orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for order: " + orderId));
        return mapToResponse(payment);
    }

    @KafkaListener(topics = "order.created", groupId = "payment-group")
    public void handleOrderCreated(Map<String, Object> orderEvent) {
        Long orderId = ((Number) orderEvent.get("orderId")).longValue();
        
        if (paymentRepository.existsByOrderId(orderId)) {
            return;
        }
    }

    private PaymentResponse mapToResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .orderId(payment.getOrderId())
                .amount(payment.getAmount())
                .method(payment.getMethod())
                .status(payment.getStatus().name())
                .transactionId(payment.getTransactionId())
                .gatewayResponse(payment.getGatewayResponse())
                .failureReason(payment.getFailureReason())
                .createdAt(payment.getCreatedAt() != null ? payment.getCreatedAt().toString() : null)
                .updatedAt(payment.getUpdatedAt() != null ? payment.getUpdatedAt().toString() : null)
                .build();
    }

    private void publishPaymentEvent(String eventType, Payment payment) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("eventType", eventType);
            event.put("paymentId", payment.getId());
            event.put("orderId", payment.getOrderId());
            event.put("amount", payment.getAmount());
            event.put("status", payment.getStatus().name());
            event.put("transactionId", payment.getTransactionId());
            event.put("timestamp", System.currentTimeMillis());
            event.put("correlationId", UUID.randomUUID().toString());

            kafkaTemplate.send("payment." + eventType.toLowerCase(), event);
        } catch (Exception e) {
        }
    }
}

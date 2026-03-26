package com.garlic.notification.service;

import com.garlic.notification.dto.NotificationRequest;
import com.garlic.notification.dto.NotificationResponse;
import com.garlic.notification.entity.Notification;
import com.garlic.notification.exception.ResourceNotFoundException;
import com.garlic.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional
    public NotificationResponse sendNotification(NotificationRequest request) {
        Notification notification = Notification.builder()
                .userId(request.getUserId())
                .type(request.getType())
                .channel(Notification.NotificationChannel.valueOf(request.getChannel().toUpperCase()))
                .status(Notification.NotificationStatus.PENDING)
                .content(request.getContent())
                .subject(request.getSubject())
                .recipient(request.getRecipient())
                .metadata(request.getMetadata())
                .build();

        notification = notificationRepository.save(notification);

        boolean success = sendByChannel(notification);

        notification.setStatus(success ? Notification.NotificationStatus.SENT : Notification.NotificationStatus.FAILED);
        if (!success) {
            notification.setErrorMessage("Failed to send notification via " + request.getChannel());
        } else {
            notification.setSentAt(LocalDateTime.now());
        }

        notification = notificationRepository.save(notification);

        return mapToResponse(notification);
    }

    private boolean sendByChannel(Notification notification) {
        return switch (notification.getChannel()) {
            case EMAIL -> sendEmail(notification);
            case SMS -> sendSMS(notification);
            case PUSH -> sendPush(notification);
            case IN_APP -> true;
        };
    }

    private boolean sendEmail(Notification notification) {
        return true;
    }

    private boolean sendSMS(Notification notification) {
        return true;
    }

    private boolean sendPush(Notification notification) {
        return true;
    }

    public NotificationResponse getNotification(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));
        return mapToResponse(notification);
    }

    public Page<NotificationResponse> getUserNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::mapToResponse);
    }

    public Page<NotificationResponse> getNotificationsByType(String type, Long userId, Pageable pageable) {
        return notificationRepository.findByTypeAndUserId(type, userId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional
    public NotificationResponse markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));
        
        notification.setStatus(Notification.NotificationStatus.READ);
        notification = notificationRepository.save(notification);
        
        return mapToResponse(notification);
    }

    @KafkaListener(topics = "order.created", groupId = "notification-group")
    public void handleOrderCreated(Map<String, Object> orderEvent) {
        Long userId = ((Number) orderEvent.get("userId")).longValue();
        
        NotificationRequest request = NotificationRequest.builder()
                .userId(userId)
                .type("ORDER_CONFIRMATION")
                .channel("EMAIL")
                .subject("Order Confirmation")
                .content("Your order has been placed successfully!")
                .build();
        
        sendNotification(request);
    }

    @KafkaListener(topics = "payment.processed", groupId = "notification-group")
    public void handlePaymentProcessed(Map<String, Object> paymentEvent) {
        Long userId = ((Number) paymentEvent.get("userId")).longValue();
        
        NotificationRequest request = NotificationRequest.builder()
                .userId(userId)
                .type("PAYMENT_CONFIRMATION")
                .channel("EMAIL")
                .subject("Payment Received")
                .content("Your payment has been processed successfully!")
                .build();
        
        sendNotification(request);
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .userId(notification.getUserId())
                .type(notification.getType())
                .channel(notification.getChannel().name())
                .status(notification.getStatus().name())
                .content(notification.getContent())
                .subject(notification.getSubject())
                .recipient(notification.getRecipient())
                .metadata(notification.getMetadata())
                .sentAt(notification.getSentAt() != null ? notification.getSentAt().toString() : null)
                .errorMessage(notification.getErrorMessage())
                .createdAt(notification.getCreatedAt() != null ? notification.getCreatedAt().toString() : null)
                .updatedAt(notification.getUpdatedAt() != null ? notification.getUpdatedAt().toString() : null)
                .build();
    }
}

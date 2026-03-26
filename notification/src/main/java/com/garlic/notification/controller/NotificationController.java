package com.garlic.notification.controller;

import com.garlic.notification.dto.NotificationRequest;
import com.garlic.notification.dto.NotificationResponse;
import com.garlic.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Notification APIs")
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping
    @Operation(summary = "Send notification", description = "Send a notification to a user")
    public ResponseEntity<NotificationResponse> sendNotification(@Valid @RequestBody NotificationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(notificationService.sendNotification(request));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get notification by ID", description = "Get notification details by ID")
    public ResponseEntity<NotificationResponse> getNotification(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.getNotification(id));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get user notifications", description = "Get all notifications for a user")
    public ResponseEntity<Page<NotificationResponse>> getUserNotifications(
            @PathVariable Long userId,
            Pageable pageable) {
        return ResponseEntity.ok(notificationService.getUserNotifications(userId, pageable));
    }

    @GetMapping("/type/{type}")
    @Operation(summary = "Get notifications by type", description = "Get notifications by type for a user")
    public ResponseEntity<Page<NotificationResponse>> getNotificationsByType(
            @PathVariable String type,
            @RequestParam Long userId,
            Pageable pageable) {
        return ResponseEntity.ok(notificationService.getNotificationsByType(type, userId, pageable));
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "Mark notification as read", description = "Mark a notification as read")
    public ResponseEntity<NotificationResponse> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.markAsRead(id));
    }
}

package com.garlic.notification.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {

    private Long id;
    private Long userId;
    private String type;
    private String channel;
    private String status;
    private String content;
    private String subject;
    private String recipient;
    private String metadata;
    private String sentAt;
    private String errorMessage;
    private String createdAt;
    private String updatedAt;
}

package com.garlic.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "Type is required")
    private String type;

    @NotBlank(message = "Channel is required")
    private String channel;

    @NotBlank(message = "Content is required")
    private String content;

    private String subject;

    private String recipient;

    private String metadata;
}

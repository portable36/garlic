package com.garlic.payment.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponse {

    private Long id;
    private Long orderId;
    private BigDecimal amount;
    private String method;
    private String status;
    private String transactionId;
    private String gatewayResponse;
    private String failureReason;
    private String createdAt;
    private String updatedAt;
}

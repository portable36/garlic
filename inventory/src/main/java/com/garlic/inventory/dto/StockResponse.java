package com.garlic.inventory.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockResponse {

    private Long id;
    private Long productId;
    private String warehouseId;
    private Integer quantity;
    private Integer reservedQuantity;
    private Integer availableQuantity;
    private Integer reorderLevel;
    private Integer maxStock;
    private String createdAt;
    private String updatedAt;
    private Boolean lowStock;
}

package com.garlic.product.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductResponse {

    private Long id;
    private String name;
    private String description;
    private String sku;
    private BigDecimal price;
    private BigDecimal discountedPrice;
    private Integer stockQuantity;
    private String brand;
    private String model;
    private String category;
    private String subcategory;
    private List<String> images;
    private String specifications;
    private Boolean active;
    private Boolean featured;
    private BigDecimal weight;
    private String dimensions;
    private String createdAt;
    private String updatedAt;
    private Boolean inStock;
}

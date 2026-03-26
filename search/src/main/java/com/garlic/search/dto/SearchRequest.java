package com.garlic.search.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchRequest {

    @NotBlank(message = "Query is required")
    private String query;

    private String category;

    private String brand;

    private Double minPrice;

    private Double maxPrice;

    private Boolean inStock;

    private String sortBy;

    private String sortOrder;
}

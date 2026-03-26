package com.garlic.search.controller;

import com.garlic.search.dto.SearchRequest;
import com.garlic.search.dto.SearchResponse;
import com.garlic.search.service.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Tag(name = "Search", description = "Search APIs")
public class SearchController {

    private final SearchService searchService;

    @PostMapping
    @Operation(summary = "Search products", description = "Search products with filters")
    public ResponseEntity<Page<SearchResponse>> searchProducts(
            @Valid @RequestBody SearchRequest request,
            Pageable pageable) {
        return ResponseEntity.ok(searchService.searchProducts(request, pageable));
    }

    @GetMapping
    @Operation(summary = "Search products via GET", description = "Search products using GET request")
    public ResponseEntity<Page<SearchResponse>> searchProductsGet(
            @RequestParam String query,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) Boolean inStock,
            Pageable pageable) {
        
        SearchRequest request = SearchRequest.builder()
                .query(query)
                .category(category)
                .brand(brand)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .inStock(inStock)
                .build();
        
        return ResponseEntity.ok(searchService.searchProducts(request, pageable));
    }

    @GetMapping("/suggestions")
    @Operation(summary = "Get search suggestions", description = "Get search suggestions based on query")
    public ResponseEntity<Page<SearchResponse>> getSuggestions(
            @RequestParam String query,
            Pageable pageable) {
        return ResponseEntity.ok(searchService.getSearchSuggestions(query, pageable));
    }

    @GetMapping("/popular")
    @Operation(summary = "Get popular searches", description = "Get popular search queries")
    public ResponseEntity<List<String>> getPopularSearches(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(searchService.getPopularSearches(limit));
    }

    @GetMapping("/history")
    @Operation(summary = "Get user search history", description = "Get user's search history")
    public ResponseEntity<List<String>> getUserSearchHistory(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(searchService.getUserSearchHistory(userId, limit));
    }
}

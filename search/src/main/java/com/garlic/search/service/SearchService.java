package com.garlic.search.service;

import com.garlic.search.dto.SearchRequest;
import com.garlic.search.dto.SearchResponse;
import com.garlic.search.entity.SearchHistory;
import com.garlic.search.repository.SearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final SearchRepository searchRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public Page<SearchResponse> searchProducts(SearchRequest request, Pageable pageable) {
        saveSearchHistory(request.getQuery(), 0, request);

        List<SearchResponse> results = performSearch(request, pageable);

        return new org.springframework.data.domain.PageImpl<>(results, pageable, results.size());
    }

    private List<SearchResponse> performSearch(SearchRequest request, Pageable pageable) {
        return new ArrayList<>();
    }

    private void saveSearchHistory(String query, Integer resultsCount, SearchRequest request) {
        SearchHistory history = SearchHistory.builder()
                .query(query)
                .resultsCount(resultsCount)
                .filters(buildFilterString(request))
                .build();
        
        searchRepository.save(history);
    }

    private String buildFilterString(SearchRequest request) {
        StringBuilder filters = new StringBuilder();
        if (request.getCategory() != null) filters.append("category:").append(request.getCategory()).append(";");
        if (request.getBrand() != null) filters.append("brand:").append(request.getBrand()).append(";");
        if (request.getMinPrice() != null) filters.append("minPrice:").append(request.getMinPrice()).append(";");
        if (request.getMaxPrice() != null) filters.append("maxPrice:").append(request.getMaxPrice()).append(";");
        return filters.toString();
    }

    public Page<SearchResponse> getSearchSuggestions(String query, Pageable pageable) {
        return searchRepository.findByQueryContainingIgnoreCase(query, pageable)
                .map(this::mapToSearchResponse);
    }

    public List<String> getPopularSearches(int limit) {
        return searchRepository.findTop10ByOrderByCreatedAtDesc().stream()
                .map(SearchHistory::getQuery)
                .distinct()
                .limit(limit)
                .toList();
    }

    public List<String> getUserSearchHistory(Long userId, int limit) {
        return searchRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(SearchHistory::getQuery)
                .toList();
    }

    @KafkaListener(topics = "product.created", groupId = "search-group")
    public void handleProductCreated(Map<String, Object> productEvent) {
    }

    @KafkaListener(topics = "product.updated", groupId = "search-group")
    public void handleProductUpdated(Map<String, Object> productEvent) {
    }

    @KafkaListener(topics = "product.deleted", groupId = "search-group")
    public void handleProductDeleted(Map<String, Object> productEvent) {
    }

    public void indexProduct(Map<String, Object> productData) {
    }

    private SearchResponse mapToSearchResponse(SearchHistory history) {
        return SearchResponse.builder()
                .name(history.getQuery())
                .build();
    }
}

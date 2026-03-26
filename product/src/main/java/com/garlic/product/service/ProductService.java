package com.garlic.product.service;

import com.garlic.product.dto.ProductRequest;
import com.garlic.product.dto.ProductResponse;
import com.garlic.product.entity.Product;
import com.garlic.product.exception.BadRequestException;
import com.garlic.product.exception.ResourceNotFoundException;
import com.garlic.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    private static final String CACHE_PREFIX = "product:cache:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(15);

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        if (productRepository.existsBySku(request.getSku())) {
            throw new BadRequestException("Product with SKU " + request.getSku() + " already exists");
        }

        Product product = mapToEntity(request);
        product = productRepository.save(product);

        publishProductCreatedEvent(product);

        return mapToResponse(product);
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));

        if (!product.getSku().equals(request.getSku()) && 
            productRepository.existsBySku(request.getSku())) {
            throw new BadRequestException("Product with SKU " + request.getSku() + " already exists");
        }

        product = mapToEntity(request);
        product.setId(id);
        product = productRepository.save(product);

        invalidateCache(product.getId());

        publishProductUpdatedEvent(product);

        return mapToResponse(product);
    }

    public ProductResponse getProduct(Long id) {
        String cacheKey = CACHE_PREFIX + id;
        
        ProductResponse cached = (ProductResponse) redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return cached;
        }

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));

        ProductResponse response = mapToResponse(product);
        redisTemplate.opsForValue().set(cacheKey, response, CACHE_TTL);

        return response;
    }

    public ProductResponse getProductBySku(String sku) {
        Product product = productRepository.findBySku(sku)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with SKU: " + sku));
        return mapToResponse(product);
    }

    public Page<ProductResponse> getAllProducts(Pageable pageable) {
        return productRepository.findByActiveTrue(pageable).map(this::mapToResponse);
    }

    public Page<ProductResponse> getProductsByCategory(String category, Pageable pageable) {
        return productRepository.findByCategory(category, pageable).map(this::mapToResponse);
    }

    public Page<ProductResponse> getFeaturedProducts(Pageable pageable) {
        return productRepository.findByFeaturedTrue(pageable).map(this::mapToResponse);
    }

    public Page<ProductResponse> searchProducts(String query, Pageable pageable) {
        return productRepository.searchProducts(query, pageable).map(this::mapToResponse);
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));

        product.setActive(false);
        productRepository.save(product);

        invalidateCache(id);
    }

    public List<ProductResponse> getProductsByIds(List<Long> ids) {
        return productRepository.findAllByIdIn(ids).stream()
                .map(this::mapToResponse)
                .toList();
    }

    public boolean checkStockAvailability(Long productId, Integer quantity) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));
        return product.getStockQuantity() >= quantity;
    }

    private void invalidateCache(Long productId) {
        redisTemplate.delete(CACHE_PREFIX + productId);
    }

    private Product mapToEntity(ProductRequest request) {
        return Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .sku(request.getSku())
                .price(request.getPrice())
                .discountedPrice(request.getDiscountedPrice())
                .stockQuantity(request.getStockQuantity())
                .brand(request.getBrand())
                .model(request.getModel())
                .category(request.getCategory())
                .subcategory(request.getSubcategory())
                .images(request.getImages())
                .specifications(request.getSpecifications())
                .active(request.getActive() != null ? request.getActive() : true)
                .featured(request.getFeatured() != null ? request.getFeatured() : false)
                .weight(request.getWeight())
                .dimensions(request.getDimensions())
                .build();
    }

    private ProductResponse mapToResponse(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .sku(product.getSku())
                .price(product.getPrice())
                .discountedPrice(product.getDiscountedPrice())
                .stockQuantity(product.getStockQuantity())
                .brand(product.getBrand())
                .model(product.getModel())
                .category(product.getCategory())
                .subcategory(product.getSubcategory())
                .images(product.getImages())
                .specifications(product.getSpecifications())
                .active(product.getActive())
                .featured(product.getFeatured())
                .weight(product.getWeight())
                .dimensions(product.getDimensions())
                .createdAt(product.getCreatedAt() != null ? product.getCreatedAt().toString() : null)
                .updatedAt(product.getUpdatedAt() != null ? product.getUpdatedAt().toString() : null)
                .inStock(product.getStockQuantity() > 0)
                .build();
    }

    private void publishProductCreatedEvent(Product product) {
        publishEvent("PRODUCT_CREATED", product);
    }

    private void publishProductUpdatedEvent(Product product) {
        publishEvent("PRODUCT_UPDATED", product);
    }

    private void publishEvent(String eventType, Product product) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("eventType", eventType);
            event.put("productId", product.getId());
            event.put("sku", product.getSku());
            event.put("name", product.getName());
            event.put("category", product.getCategory());
            event.put("price", product.getPrice());
            event.put("active", product.getActive());
            event.put("timestamp", System.currentTimeMillis());
            event.put("correlationId", UUID.randomUUID().toString());

            kafkaTemplate.send("product." + eventType.toLowerCase(), event);
        } catch (Exception e) {
        }
    }
}

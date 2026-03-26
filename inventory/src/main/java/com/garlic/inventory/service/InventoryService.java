package com.garlic.inventory.service;

import com.garlic.inventory.dto.ReserveStockRequest;
import com.garlic.inventory.dto.StockResponse;
import com.garlic.inventory.entity.Stock;
import com.garlic.inventory.exception.BadRequestException;
import com.garlic.inventory.exception.ResourceNotFoundException;
import com.garlic.inventory.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final StockRepository stockRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional
    public StockResponse createStock(Stock stock) {
        if (stockRepository.existsByProductIdAndWarehouseId(stock.getProductId(), stock.getWarehouseId())) {
            throw new BadRequestException("Stock already exists for product " + stock.getProductId() 
                + " in warehouse " + stock.getWarehouseId());
        }
        
        stock = stockRepository.save(stock);
        publishStockEvent("STOCK_CREATED", stock);
        
        return mapToResponse(stock);
    }

    @Transactional
    public StockResponse updateStock(Long id, Stock stockUpdate) {
        Stock stock = stockRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found with id: " + id));
        
        stock.setQuantity(stockUpdate.getQuantity());
        stock.setReservedQuantity(stockUpdate.getReservedQuantity());
        stock.setReorderLevel(stockUpdate.getReorderLevel());
        stock.setMaxStock(stockUpdate.getMaxStock());
        
        stock = stockRepository.save(stock);
        
        return mapToResponse(stock);
    }

    public StockResponse getStock(Long id) {
        Stock stock = stockRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found with id: " + id));
        return mapToResponse(stock);
    }

    public StockResponse getStockByProductAndWarehouse(Long productId, String warehouseId) {
        Stock stock = stockRepository.findByProductIdAndWarehouseId(productId, warehouseId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found for product " 
                    + productId + " in warehouse " + warehouseId));
        return mapToResponse(stock);
    }

    public List<StockResponse> getStockByProduct(Long productId) {
        return stockRepository.findByProductId(productId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<StockResponse> getStockByWarehouse(String warehouseId) {
        return stockRepository.findByWarehouseId(warehouseId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    public boolean checkStock(Long productId, Integer quantity) {
        Integer available = stockRepository.getTotalAvailableStock(productId);
        return available != null && available >= quantity;
    }

    @Transactional
    public StockResponse reserveStock(ReserveStockRequest request) {
        Stock stock = stockRepository.findByProductIdAndWarehouseId(
                request.getProductId(), request.getWarehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found for product " 
                    + request.getProductId() + " in warehouse " + request.getWarehouseId()));

        if (stock.getAvailableQuantity() < request.getQuantity()) {
            throw new BadRequestException("Insufficient stock. Available: " 
                + stock.getAvailableQuantity() + ", Requested: " + request.getQuantity());
        }

        stock.setReservedQuantity(stock.getReservedQuantity() + request.getQuantity());
        stock = stockRepository.save(stock);

        publishStockEvent("STOCK_RESERVED", stock);

        return mapToResponse(stock);
    }

    @Transactional
    public StockResponse releaseStock(Long productId, String warehouseId, Integer quantity) {
        Stock stock = stockRepository.findByProductIdAndWarehouseId(productId, warehouseId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found for product " 
                    + productId + " in warehouse " + warehouseId));

        stock.setReservedQuantity(Math.max(0, stock.getReservedQuantity() - quantity));
        stock = stockRepository.save(stock);

        publishStockEvent("STOCK_RELEASED", stock);

        return mapToResponse(stock);
    }

    @Transactional
    public StockResponse deductStock(Long productId, String warehouseId, Integer quantity) {
        Stock stock = stockRepository.findByProductIdAndWarehouseId(productId, warehouseId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found for product " 
                    + productId + " in warehouse " + warehouseId));

        if (stock.getQuantity() < quantity) {
            throw new BadRequestException("Insufficient stock to deduct");
        }

        stock.setQuantity(stock.getQuantity() - quantity);
        stock.setReservedQuantity(Math.max(0, stock.getReservedQuantity() - quantity));
        stock = stockRepository.save(stock);

        publishStockEvent("STOCK_DEDUCTED", stock);

        return mapToResponse(stock);
    }

    @Transactional
    public StockResponse addStock(Long id, Integer quantity) {
        Stock stock = stockRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found with id: " + id));

        stock.setQuantity(stock.getQuantity() + quantity);
        stock = stockRepository.save(stock);

        publishStockEvent("STOCK_ADDED", stock);

        return mapToResponse(stock);
    }

    private StockResponse mapToResponse(Stock stock) {
        Integer available = stock.getAvailableQuantity();
        boolean lowStock = stock.getReorderLevel() != null && available <= stock.getReorderLevel();

        return StockResponse.builder()
                .id(stock.getId())
                .productId(stock.getProductId())
                .warehouseId(stock.getWarehouseId())
                .quantity(stock.getQuantity())
                .reservedQuantity(stock.getReservedQuantity())
                .availableQuantity(available)
                .reorderLevel(stock.getReorderLevel())
                .maxStock(stock.getMaxStock())
                .createdAt(stock.getCreatedAt() != null ? stock.getCreatedAt().toString() : null)
                .updatedAt(stock.getUpdatedAt() != null ? stock.getUpdatedAt().toString() : null)
                .lowStock(lowStock)
                .build();
    }

    private void publishStockEvent(String eventType, Stock stock) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("eventType", eventType);
            event.put("stockId", stock.getId());
            event.put("productId", stock.getProductId());
            event.put("warehouseId", stock.getWarehouseId());
            event.put("quantity", stock.getQuantity());
            event.put("reservedQuantity", stock.getReservedQuantity());
            event.put("timestamp", System.currentTimeMillis());
            event.put("correlationId", UUID.randomUUID().toString());

            kafkaTemplate.send("stock." + eventType.toLowerCase(), event);
        } catch (Exception e) {
        }
    }
}

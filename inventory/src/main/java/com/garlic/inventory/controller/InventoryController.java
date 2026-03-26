package com.garlic.inventory.controller;

import com.garlic.inventory.dto.ReserveStockRequest;
import com.garlic.inventory.dto.StockResponse;
import com.garlic.inventory.entity.Stock;
import com.garlic.inventory.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@Tag(name = "Inventory", description = "Inventory APIs")
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping("/stock")
    @Operation(summary = "Create stock", description = "Create new stock entry")
    public ResponseEntity<StockResponse> createStock(@Valid @RequestBody Stock stock) {
        return ResponseEntity.status(HttpStatus.CREATED).body(inventoryService.createStock(stock));
    }

    @PutMapping("/stock/{id}")
    @Operation(summary = "Update stock", description = "Update existing stock")
    public ResponseEntity<StockResponse> updateStock(
            @PathVariable Long id,
            @Valid @RequestBody Stock stock) {
        return ResponseEntity.ok(inventoryService.updateStock(id, stock));
    }

    @GetMapping("/stock/{id}")
    @Operation(summary = "Get stock by ID", description = "Get stock details by ID")
    public ResponseEntity<StockResponse> getStock(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryService.getStock(id));
    }

    @GetMapping("/stock/product/{productId}")
    @Operation(summary = "Get stock by product", description = "Get all stock for a product")
    public ResponseEntity<List<StockResponse>> getStockByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(inventoryService.getStockByProduct(productId));
    }

    @GetMapping("/stock/warehouse/{warehouseId}")
    @Operation(summary = "Get stock by warehouse", description = "Get all stock in a warehouse")
    public ResponseEntity<List<StockResponse>> getStockByWarehouse(@PathVariable String warehouseId) {
        return ResponseEntity.ok(inventoryService.getStockByWarehouse(warehouseId));
    }

    @GetMapping("/stock/product/{productId}/warehouse/{warehouseId}")
    @Operation(summary = "Get stock by product and warehouse", description = "Get stock for specific product and warehouse")
    public ResponseEntity<StockResponse> getStockByProductAndWarehouse(
            @PathVariable Long productId,
            @PathVariable String warehouseId) {
        return ResponseEntity.ok(inventoryService.getStockByProductAndWarehouse(productId, warehouseId));
    }

    @GetMapping("/check")
    @Operation(summary = "Check stock availability", description = "Check if product has enough stock")
    public ResponseEntity<Boolean> checkStock(
            @RequestParam Long productId,
            @RequestParam Integer quantity) {
        return ResponseEntity.ok(inventoryService.checkStock(productId, quantity));
    }

    @PostMapping("/reserve")
    @Operation(summary = "Reserve stock", description = "Reserve stock for an order")
    public ResponseEntity<StockResponse> reserveStock(@Valid @RequestBody ReserveStockRequest request) {
        return ResponseEntity.ok(inventoryService.reserveStock(request));
    }

    @PostMapping("/release")
    @Operation(summary = "Release stock", description = "Release reserved stock")
    public ResponseEntity<StockResponse> releaseStock(
            @RequestParam Long productId,
            @RequestParam String warehouseId,
            @RequestParam Integer quantity) {
        return ResponseEntity.ok(inventoryService.releaseStock(productId, warehouseId, quantity));
    }

    @PostMapping("/deduct")
    @Operation(summary = "Deduct stock", description = "Deduct stock after order confirmation")
    public ResponseEntity<StockResponse> deductStock(
            @RequestParam Long productId,
            @RequestParam String warehouseId,
            @RequestParam Integer quantity) {
        return ResponseEntity.ok(inventoryService.deductStock(productId, warehouseId, quantity));
    }

    @PostMapping("/stock/{id}/add")
    @Operation(summary = "Add stock", description = "Add quantity to existing stock")
    public ResponseEntity<StockResponse> addStock(
            @PathVariable Long id,
            @RequestParam Integer quantity) {
        return ResponseEntity.ok(inventoryService.addStock(id, quantity));
    }
}

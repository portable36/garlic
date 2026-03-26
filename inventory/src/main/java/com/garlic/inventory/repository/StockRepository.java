package com.garlic.inventory.repository;

import com.garlic.inventory.entity.Stock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {

    Optional<Stock> findByProductIdAndWarehouseId(Long productId, String warehouseId);

    List<Stock> findByProductId(Long productId);

    List<Stock> findByWarehouseId(String warehouseId);

    @Query("SELECT SUM(s.quantity - s.reservedQuantity) FROM Stock s WHERE s.productId = :productId")
    Integer getTotalAvailableStock(@Param("productId") Long productId);

    boolean existsByProductIdAndWarehouseId(Long productId, String warehouseId);
}

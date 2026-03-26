package com.garlic.search.repository;

import com.garlic.search.entity.SearchHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SearchRepository extends JpaRepository<SearchHistory, Long> {

    Page<SearchHistory> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<SearchHistory> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);

    List<SearchHistory> findTop10ByOrderByCreatedAtDesc();

    Page<SearchHistory> findByQueryContainingIgnoreCase(String query, Pageable pageable);
}

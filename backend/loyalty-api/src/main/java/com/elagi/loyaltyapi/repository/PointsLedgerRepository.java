package com.elagi.loyaltyapi.repository;

import com.elagi.loyaltyapi.model.PointsLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface PointsLedgerRepository extends JpaRepository<PointsLedger, Long> {

    /**
     * Calculates total points earned by a customer in a specified date range.
     * CRITICAL FIX: Ensures correct JPQL syntax and field names.
     */
    @Query("SELECT COALESCE(SUM(l.pointChange), 0) " +
            "FROM PointsLedger l " +
            "WHERE l.customerId = :customerId " +
            "  AND l.changeType = 'Earn' " +
            "  AND l.date BETWEEN :startDate AND :endDate")
    int findTotalEarnedPointsInPeriod(
            @Param("customerId") String customerId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Custom method defined to clean up all ledger entries when a customer is
     * deleted.
     */
    void deleteByCustomerId(String customerId);
}
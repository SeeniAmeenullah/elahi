package com.elagi.loyaltyapi.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
public class PointsLedger {

    // Auto-generated primary key for the ledger entry
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    private String customerId;

    // 'Earn' or 'Redeem'
    @NotNull
    private String changeType;

    // Can be positive (Earn) or negative (Redeem)
    private int pointChange;

    private LocalDateTime date = LocalDateTime.now();

    @NotNull
    private String transactionId;

    private boolean campaignApplied = false;
}
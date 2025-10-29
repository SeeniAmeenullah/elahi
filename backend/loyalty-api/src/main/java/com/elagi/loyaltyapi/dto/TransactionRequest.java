package com.elagi.loyaltyapi.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TransactionRequest {
    @NotBlank(message = "Customer ID is required.")
    private String customerId;

    @DecimalMin(value = "0.01", message = "Amount must be greater than zero.")
    private double amount;
}
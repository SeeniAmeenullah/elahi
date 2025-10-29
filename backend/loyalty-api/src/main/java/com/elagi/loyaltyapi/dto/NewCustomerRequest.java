package com.elagi.loyaltyapi.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class NewCustomerRequest {
    @NotBlank(message = "Customer ID is required.")
    private String customerId;

    @NotBlank(message = "Name is required.")
    private String name;

    @Min(value = 0, message = "Initial points cannot be negative.")
    private int initialPoints = 0;
}
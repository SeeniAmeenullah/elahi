package com.elagi.loyaltyapi.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RedemptionRequest {
    @NotBlank(message = "Customer ID is required.")
    private String customerId;

    @Min(value = 1, message = "Points to redeem must be greater than zero.")
    private int pointsToRedeem;

    @NotBlank(message = "Reward description is required.")
    private String rewardDescription;
}
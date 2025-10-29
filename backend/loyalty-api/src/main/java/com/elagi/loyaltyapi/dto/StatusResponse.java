package com.elagi.loyaltyapi.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor // Generates a constructor with all fields
public class StatusResponse {
    private String message;
    private String customerId;
    private int newTotalPoints;
}
package com.elagi.loyaltyapi.dto;

import lombok.Data;

// Note: Use Integer here so it can be null, allowing for partial updates
@Data
public class CustomerUpdateRequest {
    private String name;
    private Integer totalPoints;
}
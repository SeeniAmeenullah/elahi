package com.elagi.loyaltyapi.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class PointsByTimeResponse {
    private String customerId;
    private LocalDate startDate;
    private LocalDate endDate;
    private int pointsEarned;
}
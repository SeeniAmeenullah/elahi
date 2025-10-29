package com.elagi.loyaltyapi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
public class Customer {

    // Unique ID for the customer (Primary Key)
    @Id
    private String customerId;

    private String name;

    private int totalPoints = 0;

    // CRITICAL: New field for soft deletion (Active = 0, Deleted = 1)
    // The CustomerRepository is configured to ignore records where this is 1.
    @Column(name = "is_deleted", nullable = false)
    private int isDeleted = 0;
}
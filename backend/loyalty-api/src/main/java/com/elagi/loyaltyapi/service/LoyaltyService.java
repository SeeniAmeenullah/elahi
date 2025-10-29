package com.elagi.loyaltyapi.service;

import com.elagi.loyaltyapi.model.Customer;
import com.elagi.loyaltyapi.model.PointsLedger;
import com.elagi.loyaltyapi.repository.CustomerRepository;
import com.elagi.loyaltyapi.repository.PointsLedgerRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class LoyaltyService {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private PointsLedgerRepository ledgerRepository;

    // --- Core Business Logic ---

    /**
     * Calculates loyalty points based on purchase amount.
     * Earns 1 point for every full 50 currency units spent (e.g., ₹50).
     */
    public int calculatePoints(double amount) {
        if (amount < 50.0) {
            return 0;
        }
        // Use integer division to get only full multiples of 50
        return (int) (amount / 50);
    }

    // --- Transactional Logic ---

    /**
     * Records a points change (Earn or Redeem) and updates the customer's total
     * points.
     */
    @Transactional // Ensures atomicity for multiple DB operations
    public Customer recordPointsEvent(String customerId, String changeType, int pointChange, String transactionId,
            boolean isRedemption) {

        // 1. Fetch customer (using the filtered findById for active customers)
        Optional<Customer> optionalCustomer = customerRepository.findById(customerId);

        Customer customer = optionalCustomer
                .orElseThrow(() -> new RuntimeException("Customer not found or is deactivated during points update."));

        // 2. Update the Customer's total points
        int newTotalPoints = customer.getTotalPoints() + pointChange;
        customer.setTotalPoints(newTotalPoints);
        Customer updatedCustomer = customerRepository.save(customer);

        // 3. Create a new Ledger entry
        PointsLedger ledgerEntry = new PointsLedger();
        ledgerEntry.setCustomerId(customerId);
        ledgerEntry.setChangeType(changeType);
        ledgerEntry.setPointChange(pointChange);
        ledgerEntry.setTransactionId(transactionId);

        ledgerRepository.save(ledgerEntry);

        return updatedCustomer;
    }

    // --- Points History Logic (CRITICAL FIX FOR DATE RANGE FUNCTIONALITY) ---

    /**
     * Retrieves the total points earned (changeType = 'Earn') by a customer
     * within a specific LocalDateTime period by delegating the query to the
     * repository.
     */
    public int getPointsEarnedInPeriod(String customerId, LocalDateTime dtStart, LocalDateTime dtEnd) {
        // This is the CRITICAL line: it calls the custom JPQL query defined in
        // PointsLedgerRepository.
        return ledgerRepository.findTotalEarnedPointsInPeriod(customerId, dtStart, dtEnd);
    }
}
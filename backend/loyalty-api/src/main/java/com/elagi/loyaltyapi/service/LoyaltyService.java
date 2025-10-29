package com.elagi.loyaltyapi.service;

import com.elagi.loyaltyapi.exception.ResourceNotFoundException;
import com.elagi.loyaltyapi.model.Customer;
import com.elagi.loyaltyapi.model.PointsLedger;
import com.elagi.loyaltyapi.repository.CustomerRepository;
import com.elagi.loyaltyapi.repository.PointsLedgerRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service // Marks this as a Spring service component
public class LoyaltyService {

    // Spring handles dependency injection for repositories
    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private PointsLedgerRepository ledgerRepository;

    /**
     * Implements the core loyalty rule: 1 point for every full ₹50 spent.
     * 
     * @param purchaseAmount The purchase amount.
     * @return The calculated points.
     */
    public int calculatePoints(double purchaseAmount) {
        // Equivalent to: int(purchase_amount // 50) * 1
        return (int) (purchaseAmount / 50) * 1;
    }

    /**
     * Records a ledger entry and updates the customer's total points.
     * 
     * @param customerId      The ID of the customer.
     * @param changeType      'Earn' or 'Redeem'.
     * @param pointChange     The point change amount (positive for earn, negative
     *                        for redeem).
     * @param transactionId   The unique ID for the transaction.
     * @param campaignApplied True if a campaign rule was applied.
     * @return The updated customer object.
     */
    @Transactional // Ensures both the Customer update and Ledger insert are atomic (transactional)
    public Customer recordPointsEvent(String customerId, String changeType, int pointChange, String transactionId,
            boolean campaignApplied) {
        // 1. Fetch the customer or throw 404
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));

        // 2. Update customer's total points
        int newTotal = customer.getTotalPoints() + pointChange;
        customer.setTotalPoints(newTotal);
        Customer updatedCustomer = customerRepository.save(customer);

        // 3. Record entry in the Points Ledger
        PointsLedger ledgerEntry = new PointsLedger();
        ledgerEntry.setCustomerId(customerId);
        ledgerEntry.setChangeType(changeType);
        ledgerEntry.setPointChange(pointChange);
        ledgerEntry.setTransactionId(transactionId);
        ledgerEntry.setCampaignApplied(campaignApplied);
        ledgerRepository.save(ledgerEntry);

        return updatedCustomer;
    }

    /**
     * Calculates total points earned by a customer in a period using the custom
     * repository query.
     */
    public int getPointsEarnedInPeriod(String customerId, LocalDateTime startDate, LocalDateTime endDate) {
        return ledgerRepository.findTotalEarnedPointsInPeriod(customerId, startDate, endDate);
    }
}
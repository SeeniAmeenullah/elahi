package com.elagi.loyaltyapi.controller;

import com.elagi.loyaltyapi.dto.*;
import com.elagi.loyaltyapi.exception.ResourceNotFoundException;
import com.elagi.loyaltyapi.model.Customer;
import com.elagi.loyaltyapi.model.PointsLedger;
import com.elagi.loyaltyapi.repository.CustomerRepository;
import com.elagi.loyaltyapi.repository.PointsLedgerRepository;
import com.elagi.loyaltyapi.service.LoyaltyService;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

// CRITICAL FIX: Explicitly allow frontend connections
@CrossOrigin(origins = { "http://localhost:3000", "http://127.0.0.1:3000" })
@RestController
@RequestMapping("/api")
public class LoyaltyController {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private PointsLedgerRepository ledgerRepository;

    @Autowired
    private LoyaltyService loyaltyService;

    // --- Customer Management ---

    @GetMapping("/customers/all")
    public List<Customer> getAllCustomers() {
        // Uses the filtered default findAll() to show only active customers
        // (isDeleted=0)
        return customerRepository.findAll();
    }

    @PostMapping("/customers/register")
    @Transactional
    public ResponseEntity<Customer> registerCustomer(@Valid @RequestBody NewCustomerRequest request) {

        // Use the filtered findById() to ensure we aren't re-registering an *active*
        // customer
        if (customerRepository.findById(request.getCustomerId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Customer ID '" + request.getCustomerId() + "' already exists (and is active).");
        }

        Customer newCustomer = new Customer();
        newCustomer.setCustomerId(request.getCustomerId());
        newCustomer.setName(request.getName());
        newCustomer.setTotalPoints(request.getInitialPoints());
        newCustomer.setIsDeleted(0); // Explicitly mark as active

        return new ResponseEntity<>(customerRepository.save(newCustomer), HttpStatus.CREATED);
    }

    @GetMapping("/customers/{customerId}")
    public Customer getCustomerDetails(@PathVariable String customerId) {
        // Uses the filtered findById()
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found."));
    }

    @PutMapping("/customers/{customerId}")
    public Customer updateCustomerDetails(@PathVariable String customerId,
            @RequestBody CustomerUpdateRequest updateRequest) {

        Optional<Customer> optionalCustomer = customerRepository.findById(customerId);

        if (optionalCustomer.isEmpty() || optionalCustomer.get().getIsDeleted() == 1) {
            throw new ResourceNotFoundException("Customer not found or is deactivated.");
        }

        Customer customer = optionalCustomer.get();
        boolean updated = false;

        if (updateRequest.getName() != null) {
            customer.setName(updateRequest.getName());
            updated = true;
        }

        if (updateRequest.getTotalPoints() != null) {
            customer.setTotalPoints(updateRequest.getTotalPoints());
            updated = true;
        }

        if (updated) {
            return customerRepository.save(customer);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No valid fields provided for update.");
        }
    }

    @DeleteMapping("/customers/{customerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteCustomer(@PathVariable String customerId) {

        // Use the base findById(String) to find the customer whether they are active or
        // not.
        Optional<Customer> optionalCustomer = customerRepository.findById(customerId);

        if (optionalCustomer.isEmpty()) {
            throw new ResourceNotFoundException("Customer not found.");
        }

        Customer customer = optionalCustomer.get();

        if (customer.getIsDeleted() == 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer is already deleted.");
        }

        // 1. Perform soft delete on the customer record
        customer.setIsDeleted(1); // Set the flag to indicate deletion
        customerRepository.save(customer);

        // Optional: We skip deleting ledger entries to maintain history (soft deletion
        // philosophy).
    }

    // --- Points Calculation & Redemption ---

    @PostMapping("/transactions/purchase")
    public StatusResponse processPurchase(@Valid @RequestBody TransactionRequest transaction) {
        String customerId = transaction.getCustomerId();

        // Uses the filtered findById()—will fail if customer is deleted (isDeleted=1)
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found. Cannot process transaction."));

        int pointsEarned = loyaltyService.calculatePoints(transaction.getAmount());

        if (pointsEarned > 0) {
            String transactionId = UUID.randomUUID().toString();
            Customer updatedCustomer = loyaltyService.recordPointsEvent(
                    customerId,
                    "Earn",
                    pointsEarned,
                    transactionId,
                    false);

            return new StatusResponse(
                    "Successfully recorded purchase of ₹" + String.format("%.2f", transaction.getAmount())
                            + ". Points awarded: " + pointsEarned + ".",
                    customerId,
                    updatedCustomer.getTotalPoints());
        } else {
            return new StatusResponse(
                    "Purchase of ₹" + String.format("%.2f", transaction.getAmount())
                            + " recorded, but the amount did not qualify for loyalty points (must be ₹50 or more).",
                    customerId,
                    customer.getTotalPoints());
        }
    }

    @PostMapping("/points/redeem")
    public StatusResponse redeemPoints(@Valid @RequestBody RedemptionRequest redemption) {
        String customerId = redemption.getCustomerId();
        int pointsToRedeem = redemption.getPointsToRedeem();

        // Uses the filtered findById()
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found."));

        int currentPoints = customer.getTotalPoints();

        if (pointsToRedeem > currentPoints) {
            // This throws the detailed error that your frontend should capture
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Insufficient points. Customer has " + currentPoints + " but tried to redeem " + pointsToRedeem
                            + ".");
        }

        int pointChange = -pointsToRedeem;

        Customer updatedCustomer = loyaltyService.recordPointsEvent(
                customerId,
                "Redeem",
                pointChange,
                UUID.randomUUID().toString(),
                true);

        return new StatusResponse(
                "Successfully redeemed " + pointsToRedeem + " points for '" + redemption.getRewardDescription() + "'.",
                customerId,
                updatedCustomer.getTotalPoints());
    }

    // --- Points Status ---

    @GetMapping("/customers/{customerId}/balance")
    public Customer getCustomerBalance(@PathVariable String customerId) {
        // Uses the filtered findById()
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found."));
    }

    @GetMapping("/customers/{customerId}/points-by-time")
    public PointsByTimeResponse getPointsByTimeRange(
            @PathVariable String customerId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {

        // Uses the filtered findById()
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found."));

        if (startDate.isAfter(endDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date cannot be after end date.");
        }

        LocalDateTime dtStart = startDate.atStartOfDay();
        LocalDateTime dtEnd = endDate.plusDays(1).atStartOfDay().minusNanos(1);

        int points = loyaltyService.getPointsEarnedInPeriod(customerId, dtStart, dtEnd);

        PointsByTimeResponse response = new PointsByTimeResponse();
        response.setCustomerId(customerId);
        response.setStartDate(startDate);
        response.setEndDate(endDate);
        response.setPointsEarned(points);

        return response;
    }
}
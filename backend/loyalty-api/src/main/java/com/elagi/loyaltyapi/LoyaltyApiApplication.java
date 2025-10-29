package com.elagi.loyaltyapi;

import com.elagi.loyaltyapi.model.Customer;
import com.elagi.loyaltyapi.model.PointsLedger;
import com.elagi.loyaltyapi.repository.CustomerRepository;
import com.elagi.loyaltyapi.repository.PointsLedgerRepository;
import lombok.NoArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.time.LocalDateTime;
import java.util.Optional;

@SpringBootApplication
@NoArgsConstructor // Fixes Lombok issue in Bean context
public class LoyaltyApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(LoyaltyApiApplication.class, args);
        System.out.println("Loyalty API running at: http://127.0.0.1:8080/api");
        System.out.println("Use the base URL: http://127.0.0.1:8080/api for all endpoints.");
    }

    @Bean
    public CommandLineRunner initialDataSeeder(CustomerRepository customerRepository,
            PointsLedgerRepository ledgerRepository) {
        return args -> {
            System.out.println("Checking database for initial data...");

            // 1. Seed Customer
            final String seededCustomerId = "CUST-001";
            Optional<Customer> existingCustomer = customerRepository.findById(seededCustomerId);

            if (existingCustomer.isEmpty()) {
                Customer initialCustomer = new Customer();
                initialCustomer.setCustomerId(seededCustomerId);
                initialCustomer.setName("Arun Kumar (System Seed)");
                initialCustomer.setTotalPoints(50);
                customerRepository.save(initialCustomer);
                System.out.println("Default CUST-001 seeded for initial ledger testing.");
            }

            // 2. Seed Ledger - only if the ledger is completely empty
            if (ledgerRepository.count() == 0) {
                PointsLedger initialLedger = new PointsLedger();
                initialLedger.setCustomerId(seededCustomerId);
                initialLedger.setChangeType("Earn");
                initialLedger.setPointChange(50);
                initialLedger.setDate(LocalDateTime.now().minusDays(100));
                initialLedger.setTransactionId("TRANS-INIT-001");
                initialLedger.setCampaignApplied(false);
                ledgerRepository.save(initialLedger);
                System.out.println("Initial ledger data seeded.");
            }
        };
    }
}
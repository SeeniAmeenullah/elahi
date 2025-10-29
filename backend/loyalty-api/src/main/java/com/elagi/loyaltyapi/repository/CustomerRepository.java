package com.elagi.loyaltyapi.repository;

import com.elagi.loyaltyapi.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, String> {

    // 1. Core method for finding all active customers (isDeleted = 0)
    List<Customer> findAllByIsDeleted(int isDeleted);

    // Default implementation of findAll() uses the filter above
    default List<Customer> findAll() {
        return findAllByIsDeleted(0);
    }

    // 2. Core method for finding a single active customer (isDeleted = 0)
    Optional<Customer> findByCustomerIdAndIsDeleted(String customerId, int isDeleted);

    // Default implementation of findById() uses the filter above
    default Optional<Customer> findById(String customerId) {
        return findByCustomerIdAndIsDeleted(customerId, 0);
    }

    // 3. Keep the base findById(String) method available from JpaRepository
    // to allow internal logic (like the delete method in the controller)
    // to fetch *all* customers, including deleted ones, using the raw ID lookup.
    // Note: Since you extend JpaRepository, the raw findById(String) is implicitly
    // available
    // but defined here explicitly for clarity if your Spring Data version requires
    // it.

}
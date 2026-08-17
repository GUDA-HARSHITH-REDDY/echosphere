package com.example.demo.controller;

import com.example.demo.entity.Restaurant;
import com.example.demo.repository.RestaurantRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/restaurants")
public class RestaurantController {

    private final RestaurantRepository repository;

    public RestaurantController(RestaurantRepository repository) {
        this.repository = repository;
    }

    // GET all restaurants
    @GetMapping
    public List<Restaurant> getAllRestaurants() {
        return repository.findAll();
    }

    // GET restaurant by ID
    @GetMapping("/{id}")
    public ResponseEntity<Restaurant> getRestaurantById(@PathVariable Long id) {

        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // CREATE restaurant
    @PostMapping
    public Restaurant createRestaurant(@RequestBody Restaurant restaurant) {
        return repository.save(restaurant);
    }

    // UPDATE restaurant
    @PutMapping("/{id}")
    public ResponseEntity<Restaurant> updateRestaurant(
            @PathVariable Long id,
            @RequestBody Restaurant restaurant) {

        return repository.findById(id)
                .map(existingRestaurant -> {

                    existingRestaurant.setName(restaurant.getName());
                    existingRestaurant.setAddress(restaurant.getAddress());
                    existingRestaurant.setPhone(restaurant.getPhone());

                    return ResponseEntity.ok(
                            repository.save(existingRestaurant)
                    );
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE restaurant
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRestaurant(@PathVariable Long id) {

        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        repository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}
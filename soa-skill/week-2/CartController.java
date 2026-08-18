package com.example.cartservice;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/cart")
public class CartController {

    @Value("${server.port}")
    private String serverPort;

    private final Map<String, Cart> carts = new HashMap<>();

    @GetMapping
    public ResponseEntity<Map<String, Object>> getCart() {
        Cart cart = new Cart("default-cart");
        cart.getItems().add(new CartItem(1L, 2));
        cart.getItems().add(new CartItem(2L, 1));

        Map<String, Object> response = new HashMap<>();
        response.put("cart", cart);
        response.put("service", "cart-service:" + serverPort);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/items")
    public ResponseEntity<Map<String, Object>> addItem(@RequestBody CartItem item) {
        Cart cart = carts.getOrDefault("default-cart", new Cart("default-cart"));
        cart.getItems().add(item);
        carts.put("default-cart", cart);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Item added to cart");
        response.put("item", item);
        response.put("service", "cart-service:" + serverPort);
        return ResponseEntity.ok(response);
    }
}

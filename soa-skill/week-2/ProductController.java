package com.example.productservice;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/products")
public class ProductController {

    @Value("${server.port}")
    private String serverPort;

    private final List<Product> products = new ArrayList<>();

    public ProductController() {
        products.add(new Product(1L, "Laptop", 1200.00, "instance-1"));
        products.add(new Product(2L, "Mouse", 25.00, "instance-1"));
        products.add(new Product(3L, "Keyboard", 80.00, "instance-1"));
    }

    @GetMapping
    public ResponseEntity<List<Product>> getAllProducts() {
        for (Product product : products) {
            product.setInstanceId("product-service:" + serverPort);
        }
        return ResponseEntity.ok(products);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable Long id) {
        Product product = products.stream()
                .filter(p -> p.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (product == null) {
            return ResponseEntity.notFound().build();
        }

        product.setInstanceId("product-service:" + serverPort);
        return ResponseEntity.ok(product);
    }

    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        Long nextId = products.stream().map(Product::getId).max(Long::compareTo).orElse(0L) + 1;
        product.setId(nextId);
        product.setInstanceId("product-service:" + serverPort);
        products.add(product);
        return ResponseEntity.ok(product);
    }
}

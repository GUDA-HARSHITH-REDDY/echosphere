package com.example.productservice;

public class Product {
    private Long id;
    private String name;
    private double price;
    private String instanceId;

    public Product() {
    }

    public Product(Long id, String name, double price, String instanceId) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.instanceId = instanceId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public String getInstanceId() {
        return instanceId;
    }

    public void setInstanceId(String instanceId) {
        this.instanceId = instanceId;
    }
}

package com.example.cartservice;

import java.util.ArrayList;
import java.util.List;

public class Cart {
    private String cartId;
    private List<CartItem> items = new ArrayList<>();

    public Cart() {
    }

    public Cart(String cartId) {
        this.cartId = cartId;
    }

    public String getCartId() {
        return cartId;
    }

    public void setCartId(String cartId) {
        this.cartId = cartId;
    }

    public List<CartItem> getItems() {
        return items;
    }

    public void setItems(List<CartItem> items) {
        this.items = items;
    }
}

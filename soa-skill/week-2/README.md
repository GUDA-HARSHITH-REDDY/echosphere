# Spring Boot Microservices Demo

This project demonstrates:

- Product service with multiple instances
- Cart service
- API Gateway with routing
- Load balancing across product service instances

## Modules

- eureka-server
- product-service
- cart-service
- api-gateway

## Run order

1. Start the Eureka server
2. Start product-service on port 8081
3. Start product-service on port 8082
4. Start cart-service on port 8091
5. Start api-gateway on port 8080

## Example commands

```bash
mvn clean install

cd eureka-server && mvn spring-boot:run
cd product-service && mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=8081"
cd product-service && mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=8082"
cd cart-service && mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=8091"
cd api-gateway && mvn spring-boot:run
```

## Test endpoints

```bash
curl http://localhost:8080/products
curl http://localhost:8080/products/1
curl -X POST http://localhost:8080/products -H "Content-Type: application/json" -d '{"name":"Laptop","price":1200.0}'
curl http://localhost:8080/cart
curl -X POST http://localhost:8080/cart/items -H "Content-Type: application/json" -d '{"productId":1,"quantity":2}'
```

## Load balancing check

Run several requests in a loop:

```bash
for i in $(seq 1 10); do curl -s http://localhost:8080/products; echo; done
```

You should see the response include different instance ids across calls.

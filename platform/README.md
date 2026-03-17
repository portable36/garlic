# E-Commerce Microservices Platform

A scalable, modular, production-ready microservices eCommerce platform built with Next.js, Go, and modern cloud-native technologies.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for frontend)

---

## Option 1: Docker Compose (All Services)

```bash
cd platform/infrastructure/docker
docker-compose up -d
```

This starts:
- Frontend: http://localhost:3000
- Auth Service: http://localhost:8081
- Product Service: http://localhost:8082
- Cart Service: http://localhost:8083
- Order Service: http://localhost:8084
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- MinIO: http://localhost:9000 (console: http://localhost:9001)

---

## Option 2: Manual Setup

### 1. Start Infrastructure
```bash
# PostgreSQL
docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15-alpine

# Redis  
docker run -p 6379:6379 redis:7-alpine

# MinIO
docker run -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin minio/minio server /data --console-address ":9001"
```

### 2. Create Databases
```bash
docker exec -it <postgres-container> psql -U postgres
# Then run:
CREATE DATABASE auth_db;
CREATE DATABASE product_db;
CREATE DATABASE order_db;
```

### 3. Build & Run Go Services
```bash
cd platform/services/auth-service
go build -o auth-service ./cmd
./auth-service

# Repeat for: product-service, cart-service, order-service
```

### 4. Run Frontend
```bash
cd platform/frontend
npm install
npm run dev
```

---

## Access the Platform

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Products | http://localhost:3000/products |
| Login | http://localhost:3000/auth/login |
| Register | http://localhost:3000/auth/register |
| Cart | http://localhost:3000/cart |
| Orders | http://localhost:3000/orders |
| MinIO Console | http://localhost:9001 (minioadmin/minioadmin) |

---

## Test Credentials
- Register a new user at http://localhost:3000/auth/register
- Or use API directly:
```bash
curl -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```

---

## Tech Stack
- **Frontend**: Next.js 14, React, TailwindCSS, React Query
- **Backend**: Go (Gin framework)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Storage**: MinIO (S3 compatible)

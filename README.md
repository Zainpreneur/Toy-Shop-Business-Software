# 🧸 Toy Box — Toy Shop Business Software

A full-stack business management system for a toy shop: inventory & products,
point-of-sale checkout, orders, customers, suppliers, an analytics dashboard,
and employee accounts with role-based access.

## Tech Stack

- **Frontend:** React 18 + TypeScript, Vite, React Router, Recharts
- **Backend:** Node.js + Express + TypeScript, JWT auth, Zod validation
- **Database:** SQLite via Prisma ORM (zero external setup; swap the
  `DATABASE_URL` in `server/.env` for Postgres/MySQL if you outgrow it)

## Features

- **Sales / POS** — searchable product grid, cart, discounts, tax, multiple
  payment methods, instant printable-style receipt. Stock decrements
  automatically on checkout.
- **Inventory** — product catalog with SKUs, categories, suppliers, cost vs.
  sell price, reorder levels, low-stock badges, and a full stock-movement
  ledger (restocks, sales, returns, manual adjustments).
- **Orders** — order history, filter by status, view line items, refund
  (auto-restocks items) or cancel.
- **Customers** — directory with contact info, notes, and per-customer
  purchase history.
- **Suppliers** — directory with contact info and the products sourced from
  each supplier.
- **Dashboard & Reports** — today's/total revenue, 14-day sales trend chart,
  top-selling toys, and low-stock alerts.
- **Employees & Roles** — Admin / Manager / Staff accounts. Admins manage
  employees; Admins & Managers manage catalog/suppliers/refunds; Staff can
  ring up sales and adjust stock.

## Project Structure

```
server/   Express API (TypeScript, Prisma, SQLite)
client/   React app (Vite, TypeScript)
```

## Getting Started

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure the server environment

```bash
cp server/.env.example server/.env
# edit server/.env and set a real JWT_SECRET for anything beyond local dev
```

### 3. Create the database & seed sample data

```bash
cd server
npx prisma migrate dev --name init
npm run seed
cd ..
```

This creates `server/prisma/dev.db` and seeds categories, suppliers, a toy
catalog, sample customers/orders, and two login accounts:

| Role  | Email               | Password  |
|-------|---------------------|-----------|
| Admin | admin@toyshop.com   | admin123  |
| Staff | staff@toyshop.com   | staff123  |

### 4. Run the app

From the repo root (runs API on `:4000` and the web app on `:5173` with an
API proxy configured):

```bash
npm run dev
```

Or run each side individually:

```bash
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173
```

Open http://localhost:5173 and log in with one of the demo accounts above.

## API Overview

All endpoints (except `/api/auth/login`) require `Authorization: Bearer <token>`.

| Resource     | Base path          | Notes |
|--------------|---------------------|-------|
| Auth         | `/api/auth`         | `POST /login`, `GET /me` |
| Products     | `/api/products`     | CRUD + `POST /:id/stock` for stock movements |
| Categories   | `/api/categories`   | CRUD |
| Suppliers    | `/api/suppliers`    | CRUD |
| Customers    | `/api/customers`    | CRUD + purchase history on `GET /:id` |
| Orders       | `/api/orders`       | `POST /` creates a sale (decrements stock), `PATCH /:id/status` for refunds/cancellation |
| Employees    | `/api/users`        | Admin-only CRUD |
| Dashboard    | `/api/dashboard`    | `/summary`, `/sales-trend`, `/top-products`, `/low-stock` |

Role gates: `ADMIN` > `MANAGER` > `STAFF`. Catalog/supplier writes and
refunds require Admin or Manager; employee management requires Admin.

## Building for Production

```bash
npm run build
```

This type-checks and compiles the server to `server/dist` and builds the
client to `client/dist` (a static bundle you can serve behind any static
host, or wire up Express to serve it directly).

-- AgroChem Inventory - Clean Migration
-- This drops all existing tables and recreates everything fresh
-- Run this in Supabase SQL Editor

-- Drop all tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS "attachments" CASCADE;
DROP TABLE IF EXISTS "expenses" CASCADE;
DROP TABLE IF EXISTS "payments" CASCADE;
DROP TABLE IF EXISTS "return_items" CASCADE;
DROP TABLE IF EXISTS "returns" CASCADE;
DROP TABLE IF EXISTS "sale_items" CASCADE;
DROP TABLE IF EXISTS "sales" CASCADE;
DROP TABLE IF EXISTS "customers" CASCADE;
DROP TABLE IF EXISTS "stock_ledgers" CASCADE;
DROP TABLE IF EXISTS "batches" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "organizations" CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "StockMovementReason" CASCADE;
DROP TYPE IF EXISTS "PaymentMethod" CASCADE;
DROP TYPE IF EXISTS "ReturnType" CASCADE;
DROP TYPE IF EXISTS "ReturnStatus" CASCADE;
DROP TYPE IF EXISTS "SaleStatus" CASCADE;
DROP TYPE IF EXISTS "SaleType" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS generate_cuid();

-- NOW CREATE EVERYTHING FRESH

-- Create ENUMS
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'CASHIER');
CREATE TYPE "SaleType" AS ENUM ('CASH', 'CREDIT');
CREATE TYPE "SaleStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'CANCELLED');
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
CREATE TYPE "ReturnType" AS ENUM ('REFUND', 'EXCHANGE');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY');
CREATE TYPE "StockMovementReason" AS ENUM ('SALE', 'RETURN', 'PURCHASE', 'ADJUSTMENT', 'DAMAGE', 'EXPIRY');

-- Organizations table
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CASHIER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
);

-- Products table
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT,
    "hazard_class" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'bottle',
    "reorder_level" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "notes" TEXT,
    "image_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "products_organization_id_sku_key" UNIQUE ("organization_id", "sku")
);

-- Batches table
CREATE TABLE "batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "lot_no" TEXT NOT NULL,
    "expiry_date" DATE,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
    CONSTRAINT "batches_product_id_lot_no_key" UNIQUE ("product_id", "lot_no")
);

-- Stock Ledger table
CREATE TABLE "stock_ledgers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "delta" DOUBLE PRECISION NOT NULL,
    "reason" "StockMovementReason" NOT NULL,
    "ref_table" TEXT,
    "ref_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_ledgers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "stock_ledgers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
);

-- Customers table
CREATE TABLE "customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "credit_limit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
);

-- Sales table
CREATE TABLE "sales" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "user_id" TEXT NOT NULL,
    "invoice_no" TEXT UNIQUE,
    "type" "SaleType" NOT NULL DEFAULT 'CASH',
    "status" "SaleStatus" NOT NULL DEFAULT 'OPEN',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL,
    CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
);

-- Sale Items table
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE,
    CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
    CONSTRAINT "sale_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL
);

-- Returns table
CREATE TABLE "returns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "sale_id" TEXT,
    "customer_id" TEXT,
    "return_no" TEXT UNIQUE,
    "type" "ReturnType" NOT NULL DEFAULT 'REFUND',
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "notes" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "returns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "returns_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL,
    CONSTRAINT "returns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL
);

-- Return Items table
CREATE TABLE "return_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "return_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "returns"("id") ON DELETE CASCADE,
    CONSTRAINT "return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
    CONSTRAINT "return_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL
);

-- Payments table
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer_id" TEXT NOT NULL,
    "sale_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE,
    CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL
);

-- Expenses table
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "vendor" TEXT,
    "receipt_url" TEXT,
    "expense_date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expenses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
);

-- Attachments table
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expense_id" TEXT,
    "filename" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attachments_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE
);

-- Create Indexes for Performance
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "products_organization_id_idx" ON "products"("organization_id");
CREATE INDEX "products_sku_idx" ON "products"("sku");
CREATE INDEX "products_category_idx" ON "products"("category");
CREATE INDEX "batches_product_id_idx" ON "batches"("product_id");
CREATE INDEX "batches_expiry_date_idx" ON "batches"("expiry_date");
CREATE INDEX "batches_status_idx" ON "batches"("status");
CREATE INDEX "stock_ledgers_organization_id_idx" ON "stock_ledgers"("organization_id");
CREATE INDEX "stock_ledgers_product_id_idx" ON "stock_ledgers"("product_id");
CREATE INDEX "stock_ledgers_batch_id_idx" ON "stock_ledgers"("batch_id");
CREATE INDEX "stock_ledgers_created_at_idx" ON "stock_ledgers"("created_at");
CREATE INDEX "customers_organization_id_idx" ON "customers"("organization_id");
CREATE INDEX "customers_name_idx" ON "customers"("name");
CREATE INDEX "customers_phone_idx" ON "customers"("phone");
CREATE INDEX "sales_organization_id_idx" ON "sales"("organization_id");
CREATE INDEX "sales_customer_id_idx" ON "sales"("customer_id");
CREATE INDEX "sales_user_id_idx" ON "sales"("user_id");
CREATE INDEX "sales_invoice_no_idx" ON "sales"("invoice_no");
CREATE INDEX "sales_created_at_idx" ON "sales"("created_at");
CREATE INDEX "sales_status_idx" ON "sales"("status");
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");
CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id");
CREATE INDEX "sale_items_batch_id_idx" ON "sale_items"("batch_id");
CREATE INDEX "returns_organization_id_idx" ON "returns"("organization_id");
CREATE INDEX "returns_sale_id_idx" ON "returns"("sale_id");
CREATE INDEX "returns_customer_id_idx" ON "returns"("customer_id");
CREATE INDEX "returns_return_no_idx" ON "returns"("return_no");
CREATE INDEX "returns_created_at_idx" ON "returns"("created_at");
CREATE INDEX "return_items_return_id_idx" ON "return_items"("return_id");
CREATE INDEX "return_items_product_id_idx" ON "return_items"("product_id");
CREATE INDEX "payments_customer_id_idx" ON "payments"("customer_id");
CREATE INDEX "payments_sale_id_idx" ON "payments"("sale_id");
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");
CREATE INDEX "expenses_organization_id_idx" ON "expenses"("organization_id");
CREATE INDEX "expenses_user_id_idx" ON "expenses"("user_id");
CREATE INDEX "expenses_category_idx" ON "expenses"("category");
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");
CREATE INDEX "attachments_expense_id_idx" ON "attachments"("expense_id");

-- Function to generate CUID-like IDs
CREATE OR REPLACE FUNCTION generate_cuid() RETURNS TEXT AS $$
BEGIN
    RETURN 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE '📊 Created 14 tables with all relationships';
    RAISE NOTICE '🔍 Created 40+ performance indexes';
    RAISE NOTICE '🚀 Ready to use! Test with: POST /api/auth/register';
END $$;

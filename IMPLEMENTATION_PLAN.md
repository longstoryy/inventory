# Enterprise Implementation Roadmap

This document outlines the steps to elevate "Aurum Inventory" to a secure, enterprise-grade platform.

## Phase 1: Security Hardening & Core Integrity
**Objective**: Enforce strict input validation, secure data handling, and complete the asset management lifecycle.

- [ ] **Data Validation Layer**
    - [ ] Create `src/lib/validators.ts` using `zod`.
    - [ ] Define schemas for Products, Sales, Expenses, and Organizations.
- [ ] **API Security Hardening**
    - [ ] Refactor `api/products` to use Zod validation (Strict Input Sanitization).
    - [ ] Refactor `api/sales` and `api/expenses` to use Zod validation.
    - [ ] Ensure strict Role-Based Access Control (RBAC) on all mutations (Create/Update/Delete).
- [ ] **Asset Management Completion**
    - [ ] Implement **Edit Product** API (`PUT /api/products/[id]`).
    - [ ] Implement **Delete/Archive** Logic (Soft delete preferred for enterprise).
    - [ ] Wire up "Edit Dossier" button in Product Details UI.
    - [ ] Implement Search & filtering for the Product Catalog.

## Phase 2: Financial & Operational Robustness
**Objective**: Ensure financial data accuracy and automated external integrations.

- [ ] **Payment Integration**
    - [ ] Implement Paystack Webhook Handler (`api/webhooks/paystack`).
    - [ ] Verify webhook signatures for security.
    - [ ] Auto-update subscription status upon payment.
- [ ] **Audit Logging**
    - [ ] Create `src/lib/audit.ts` utility.
    - [ ] Log critical actions (Login, Delete, Role Change) to database.
    - [ ] Create Audit Log Viewer in Settings.

## Phase 3: Intelligence & "Wow" Factor
**Objective**: Deliver the "Predictive" and "Cognitive" features promised by the UI.

- [ ] **Notifications System**
    - [ ] Implement secure toast notifications (replacing `alert()`).
    - [ ] Backend alert engine for Low Stock properties.
- [ ] **Predictive Analytics**
    - [ ] Implement linear regression or moving average for Sales Forecasts.
    - [ ] Visualize "Projected Stock Depletion" in Dashboard.
- [ ] **User Experience Polish**
    - [ ] Loading skeletons for all data-fetching pages.
    - [ ] Optimized transitions and micro-interactions.

---

**Status Log:**
- Plan Created: 2026-01-30
